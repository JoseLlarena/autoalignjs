/**
 * 
 * @module autoalign
 * 
 */

import * as edit from './edit';
import * as fn from './cost-functions';

export { GAP } from './edit';
export * from './stats';
export * from './cost-functions';
/**
 * An edit operation cost function.
 * It should accept the {@link GAP} symbol as a first argument for left gap, aka right-deletion, and as a second argument
 * for right gap aka right-insertion. The costs must be non-negative.  
 * 
 * <i>Parameters are not checked for validity</i>.
 *
 * @callback cost-function
 * @property {float} [max_cost=1] - the higest cost given to an edit operation, assumed 1 if missing
 * @param {string} left - a non-empty symbol in the left (L) string/array, or the {@link GAP} symbol
 * @param {string} right - a non-empty symbol in the right (R) string/array, or the {@link GAP} symbol
 * @return {float} non-negative cost
 */

/**
 * An estimator for the initial autoalign cost function
 * 
 * @callback cost-function-estimator
 * @param {Pair[]} pairs - An array of pairs of sequences, each as a 2-element array; the sequences can be a strings or an array of strings
 * @param {cost-function-builder} cost_function_from - a function that builds a cost function from alingment statistics
 * @return {cost-function} the estimated cost function
 */

/**
 * A function that builds an edit distance cost function based on alignment statistics
 * 
 * @callback cost-function-builder 
 * @param {Array} param0 - joint, left marginal, right margin, zero count and total count statistcs
 * @param {Array} param1 - size of left-right combined vocabulary, size of the left vocabulary and size of the right vocabulary
 * @param {function} score_fn - the scoring function, it's passed the log joint probability, the log left probability and the log right probabiblity
 * @param {cost-function} the statistics-based cost-function
 
 */

/**
 * callback invoked during the realignment process to allow for printing out. It is currently called with:
 * 
 * Topic        Message
 * 
 * 'alignment'  optimal alignment as string array
 * 
 * 'cost'       unnormalised average aligment cost as a float
 * 
 * @callback publisher
 * @param {string} topic - the topic to be published about
 * @param {string} message - the message
 * @return {void}
 */

/**
 * An array representing the result of aligning a left and a right sequence
 * @typedef {Array} Tuple
 * @property {string[]} left_alignment - the left sequence,  aligned
 * @property {string[]} right_alignment - the right sequence, aligned
 * @property {float} score - the alignment score in [0, 1], higher for better alignments
 */

/**
 * A paired sequence
 * @typedef {Array} Pair
 * @property {string|string[]} left - the left sequence
 * @property {string|string[]} right - the right sequence
 */

export const
    /** An alignment sort function that uses the alignment score as key, in descending order
     * @const 
     * @type {function}
     * @default
     */
    BY_SCORE = (a, b) => b[2] - a[2],
    /** an Alignment sort function that uses the left string as key, in ascending order
     * @const 
     * @type {function}
     * @default
     */
    BY_ALPHA = ((a, b) => a[0] - b[0]);

const {max} = Math;

/**
 *  aligns the given paired sequences using the initial cost function estimator, the cost function builder and the publisher
 *  
 * @param {Pair[]} pairs - An array of pairs of sequences, each as a 2-element array; the sequences can be a strings or an array of strings
 * @param {cost-function-estimator} init_cost_fn_estimator - the function that estimates of the initial cost function
 * @param {cost-function-builder} [cost_fn_from] - the function that builds the cost function from status
 * @param {publisher} [publish=noop] - the function that is passed messages with associated topics for publishing, if not provided it will do nothing
 * @return {Tuple} an array of alignment tuples, each a 3-element array containing the left alignment, the right alignment and the alignment score
 */
export function autoalign(pairs, init_cost_fn_estimator, cost_fn_from, publish = _ => _)
{
    const init_cost_fn = init_cost_fn_estimator(pairs, cost_fn_from);
    const cost_fn = fn.alignment_cost_fn_estimator(pairs, init_cost_fn, cost_fn_from, publish);
    

    return pairs.map(([L, R]) =>
    {
        const grid = edit.grid(L, R, cost_fn);  

        const [aL, aR] = edit.all_alignments(L, R, cost_fn, grid)[0], //picks any alignment, the first one will do
            cost = grid[grid.length - 1][grid[0].length - 1];
            
        return [aL, aR, normalised(aL.length, aR.length, cost, cost_fn.max_cost )];
    });
}
/*
 * Builds the contents of a csv alignment file containing one row per alignment in a CSV-format
 * @param {Tuple[]} alignments - an array whose elements are 3-element arrays containing the left, alignment, right alignment and score
 * @return {string} text containing the CSV-formatted alignment tuples
 */
export function csv_text_from_alignments(alignments)
{
    let text = '';

    for (const [aL, aR, score] of alignments)
    {
        text += `${aL.join(' ')}, ${aR.join(' ')}, ${score}\n`;
    }

    return text;
}

/*
 * Builds the contents of a pretty printed alignment file containing one row per alignment in a human readble format
 * 
 * @param {Tuple[]} alignments - an array whose elements are 3-element arrays containing the left, alignment, right alignment and score
 * @return {string} text containing the pretty-printed alignment tuples
 */
export function pretty_text_from_alignments(alignments)
{
    const spaces = new Array(10).fill(' ').join('');
    const norm = s => s.join(' ').replace(/\,/g, ':'),
        as_string = x => x.toString().replace(/\,/g, ':'),
        pad = (a, b) => a.length < b.length ? a + spaces.slice(0, b.length - a.length) : a;

    let text = '',
        i = 0;
    const fmt = new Intl.NumberFormat([], { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    for (const [aL, aR, score] of alignments)
    {
        text += `${fmt.format(score)} ` +
            `${norm(aL.map((left, i) => pad(as_string(left), as_string(aR[i]))))}\n` +
            `     ${norm(aR.map((right, i) => pad(as_string(right), as_string(aL[i]))))}\n\n`;
    }

    return text;
}

/*
 *  Normalises an alignment's cost in [0, 1] and converts it into a score, the higher the score the better the alignment
 * 
 * @param {int} aL_len - the length of the left's sequence
 * @param {int} aR_len - the length of the right's sequence
 * @param {float} cost - the alignment's cost
 * @param {float} max_cost - the maximum possible cost given to an edit operation
 */
function normalised(aL_len, aR_len, cost, max_cost)
{
    return 1 - cost / (max(aL_len, aR_len) * max_cost);
}