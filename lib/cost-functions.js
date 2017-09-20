import * as edit from './edit';
import * as st from './stats';

const { log, pow, min, max, abs } = Math, { NEGATIVE_INFINITY: neginf, POSITIVE_INFINITY: posinf } = Number;

const
    gap_filler = new Array(1000).fill(edit.GAP),
    undef = obj => typeof obj === 'undefined';
/**
 * estimates an edit alignment cost function from the given paired sequences, starting with the inital 
 * cost function and using the provided cost function builder. The publish parameter is a function
 * meant for print out results whiles the process is online
 * @alias module:autoalign#alignment_cost_fn_estimator
 * @param {Pair[]} pairs -the list of paired sequences
 * @param {cost-function} init_cost_fn  - the initial cost function
 * @param {cost-function-builder} cost_fn_from - the function that generates the cost function from the statistics
 * @param {publisher} [publish=noop] - the function that is passed messages with associated topics for publishing, if not provided it will do nothing
 * @return {cost-function} the estimated cost function
 */
export function alignment_cost_fn_estimator(pairs, init_cost_fn, cost_fn_from, publish = _ => _)
{
    const
        N = pairs.length,
        sizes = st.vocab_sizes(pairs);

    let
        old_cost_fn = init_cost_fn,
        cost_fn = init_cost_fn,
        old_cost = posinf,
        joint_stats = new st.Stats();

    while (true)
    {
        let new_cost = 0;

        for (const [L, R] of pairs)
        {
            const grid = edit.grid(L, R, cost_fn);

            new_cost += grid[R.length][L.length];

            const all = edit.all_alignments(L, R, cost_fn, grid);

            for (const a of all)
            {
                joint_stats = st.joint_stats_from_alignment(a, joint_stats, all.length);
            }

            publish('alignment', all[0]);
        }

        new_cost /= N;

        publish('cost', new_cost);

        if (new_cost >= old_cost) return old_cost_fn;

        old_cost_fn = cost_fn;
        cost_fn = cost_fn_from(st.smoothed_stats(joint_stats, sizes), sizes);
        old_cost = new_cost;
        joint_stats.reset();
    }
}
/**
 * It estimates counts by aligning sequences to the left and padding on the right of the shorter one if they lengths differ.
 * It is much simpler than uniform alignment estimation, with similar results for English g2p alignment
 * @alias module:autoalign#padding_cost_fn_estimator
 * @param {Pair[]} pairs -the list of paired sequences
 * @param {cost-function-builder} cost_fn_from - the function that generates the cost function from the statistics
 * @return {cost-function} the estimated cost function
 */
export function padding_cost_fn_estimator(pairs, cost_fn_from)
{
    let stats = new st.Stats();

    for (const [L, R] of pairs)
    {
        const h = L.length,
            v = R.length;
        const aL = h >= v ? L : L.concat(gap_filler.slice(0, v - h));
        const aR = v >= h ? R : R.concat(gap_filler.slice(0, h - v));

        stats = st.joint_stats_from_alignment([aL, aR], stats);
    }

    const sizes = st.vocab_sizes(pairs);

    return cost_fn_from(st.smoothed_stats(stats, sizes), sizes);
}
/**
 * It estimates counts by aligning matching symbols when the sequences have the same length, and by equally dividing
 * the longer sequence's symbols by the shorter sequence's when their lengths differ.
 * @alias module:autoalign#uniform_cost_fn_estimator
 * @param {Pair[]} pairs -the list of paired sequences
 * @param {cost-function-builder} cost_fn_from - the function that generates the cost function from the statistics
 * @return {cost-function} the estimated cost function
 */
export function uniform_cost_fn_estimator(pairs, cost_fn_from)
{
    const stats = new st.Stats();

    for (const [L, R] of pairs)
    {
        const QL = L.length,
            HL = R.length;

        if (QL >= HL)
        {
            const delta = QL / HL,
                half_delta = delta * .5;

            for (let q = 0; q < QL; q++)
            {
                const q_c = q + .5;

                for (let h = 0; h < HL; h++)
                {
                    const h_c = h * (delta) + half_delta;
                    stats[L[q] + st.SEP + R[h]] = (stats[L[q] + st.SEP + R[h]] || 0) + 1 / pow(abs(q_c - h_c) + 1, 2);
                }

                if (QL > HL) stats[L[q] + st.SEP + edit.GAP] = (QL - HL) / QL;
            }
        }
        else
        {
            const delta = HL / QL,
                half_delta = delta * .5;

            for (let h = 0; h < HL; h++)
            {
                const h_c = h + .5;

                for (let q = 0; q < QL; q++)
                {
                    const q_c = q * (delta) + half_delta;
                    stats[L[q] + st.SEP + R[h]] = (stats[L[q] + st.SEP + R[h]] || 0) + 1 / pow(abs(q_c - h_c) + 1, 2);
                    stats[edit.GAP + st.SEP + L[q]] = (HL - QL) / HL;
                }
            }
        }
    }

    const vocab_sizes = st.vocab_sizes(pairs);
    return cost_fn_from(st.smoothed_stats(stats, vocab_sizes), vocab_sizes);
}


/**
 * Builds a pmi-based edit distance cost function based on alignment statistics
 * @alias module:autoalign#pmi_cost_fn_from
 * @param {Array} param0 - joint, left marginal, right margin, zero count and total count statistcs
 * @param {Array} param1 - size of left-right combined vocabulary, size of the left vocabulary and size of the right vocabulary
 * @param {function} [score_fn=npmi] - the scoring function, if missing it will default to [0-1]-normalised pointwise mutual information
 * @param {cost-function} the statistics-based cost-function
 */
export function pmi_cost_fn_from([joint_stats, l_stats, r_stats, unseen_count, N], [duo_n, left_n, right_n], score_fn = npmi)
{
    const
        log_joints = {},
        log_ls = {},
        log_rs = {};

    for (const duo of joint_stats.keys()) log_joints[duo] = log(joint_stats[duo] / N);
    for (const left of l_stats.keys()) log_ls[left] = log(l_stats[left] / N);
    for (const right of r_stats.keys()) log_rs[right] = log(r_stats[right] / N);

    // technically incorrect for those extremely rare cases where the gap has not been seen,
    // in which case a minus 1 should be added to the terms inside the logs;
    // even in those cases the effect should be neglegible
    const
        OOV = log(unseen_count / N),
        left_OOV = log(unseen_count / N * right_n),
        right_OOV = log(unseen_count / N * left_n);


    function cost_fn(left, right)
    {
        const duo_log_p = log_joints[left + st.SEP + right],
            left_log_p = log_ls[left],
            right_log_p = log_rs[right];

        const score = score_fn(undef(duo_log_p) ? OOV : duo_log_p,
            undef(left_log_p) ? left_OOV : left_log_p,
            undef(right_log_p) ? right_OOV : right_log_p);

        cost_fn.max_cost = max(cost_fn.max_cost, score);

        return score;
    }

    cost_fn.max_cost = neginf;

    return cost_fn;
}
/**
 * Computes the shifted normalised pointwise mutual information, in [0, 1]. Higher values imply a lower probability 
 * of seen the left and joint symbols together
 * @alias module:autoalign#npmi
 * @param {float} logjoint - the logarithm of the joint probability of left and right symbols
 * @param {float} logl - the logarithm of the marginal probability of left symbol
 * @param {float} logr - the logarithm of the marginal probability of right symbol
 * @returns {float} the shifted normalised pointwise mutual information, in [0, 1]
 */
export function npmi(logjoint, logl, logr) { return ((logjoint - logl - logr) / logjoint + 1) * .5; };
/**
 * Computes the negative pointwise mutual information  to the k-th. Higher values imply a lower probability of seen the left and joint symbols together.
 * 
 * k == 1 is identical to negative standard pmi; values of k less than 2 are reals; values above are non-negative
 * @alias module:autoalign#pmi
 * @param {float} logjoint - the logarithm of the joint probability of left and right symbols
 * @param {float} logl - the logarithm of the marginal probability of left symbol
 * @param {float} logr - the logarithm of the marginal probability of right symbol
 * @param {float} k - the power to raise pmi to
 * @return {float} the negative pointwise mutual information  
 */
export function pmi(logjoint, logl, logr, k = 2) { return -(k * logjoint - logl - logr); };