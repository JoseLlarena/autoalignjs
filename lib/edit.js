export const
    /**
     * The symbol representing an edit gap, the middle dot, U+00B7
     * @const 
     * @type {string}
     * @default
     */
    GAP = '·';

const { min, max, abs, floor, ceil } = Math,
F32 = Float32Array,
    DELTA = 1e-5,
    ε = GAP;

/*
 * Builds a 2D-array where each cell contains the cost of the partial paths ending in the
 * corresponding positions of the left and right strings. The last cell contains the minimum
 * edit distance, aka, alignment cost.
 * @param {string|string[]} L - the left sequence
 * @param {string|string[]} R - the right sequence
 * @param {cost-fn} cost_fn - the edit operation cost function
 * @param {Array.Array.float} a 2D array filled with the partial alignment costs
 */
export function grid(L, R, cost_fn)
{
    const h = L.length + 1,
        v = R.length + 1,
        grid = Array.from({ length: v }, _ => new F32(h));

    for (let r = 1; r < v; r++)
        grid[r][0] = grid[r - 1][0] + cost_fn(ε, R[r - 1]); //first column						

    for (let c = 1; c < h; c++)
    {
        grid[0][c] = grid[0][c - 1] + cost_fn(L[c - 1], ε); //first row

        for (let r = 1; r < v; r++)
        {
            grid[r][c] = min(
                grid[r - 1][c - 1] + cost_fn(L[c - 1], R[r - 1]), //diagonal/substitution
                grid[r - 1][c] + cost_fn(ε, R[r - 1]), //vertical/left gap					
                grid[r][c - 1] + cost_fn(L[c - 1], ε)); //horizontal/right gap
        }
    }

    return grid;
}
/*
 * Computes all optimal alignments for the given paired sequences, with the cost function provided
 * and the filled cost grid. The rest of the arguments are not to be provided but are state-keeping 
 * datastructures used by this function during recursion. 
 * 
 * <i>for cost functions with many equal weights for all operations, the stack might overflow as the
 * number of optimal alignments approaches the total number of alignments, which is a factorial function
 * of the lenght of the paired sequences</i>
 * 
 * <i>Parameters are not validated</i>
 * 
 * @param {string|string[]} L - the left sequence
 * @param {string|string[]} R - the right sequence
 * @param {cost-fn} cost_fn - the edit operation cost function
 * @param {Array.Array.float} grid - the alignment cost grid
 * @param {Array.Array.string | Array.Array.string[]} alignment - the current partial alignment
 * @param {int} h - length of the left sequence
 * @param {int} v - length of the right sequence
 * @return {Array.Array.Array.string[]}  a list with all the optimal alignments
 */
export function all_alignments(L, R, cost_fn, grid, alignment = [
    [],
    []
], h = L.length, v = R.length)
{
    if (h === 0 && v === 0) return [alignment];

    const Q_align = alignment[0],
        H_align = alignment[1],
        alignments = [];

    if (h === 0)
    {
        for (let k = v; k > 0; k--)
        {
            Q_align.unshift(ε);
            H_align.unshift(R[k - 1]);
        }

        alignments.push(alignment)
    }
    else if (v === 0)
    {
        for (let k = h; k > 0; k--)
        {
            Q_align.unshift(L[k - 1]);
            H_align.unshift(ε);
        }

        alignments.push(alignment)
    }
    else
    { //diagonal/substitution
        if (abs(grid[v][h] - grid[v - 1][h - 1] - cost_fn(L[h - 1], R[v - 1])) < DELTA)
        {
            alignments.push(...recurse(L, R, cost_fn, grid, Q_align, H_align, h - 1, v - 1, L[h - 1], R[v - 1]));
        }
        //vertical/left gap
        if (abs(grid[v][h] - grid[v - 1][h] - cost_fn(ε, R[v - 1])) < DELTA)
        {
            alignments.push(...recurse(L, R, cost_fn, grid, Q_align, H_align, h, v - 1, ε, R[v - 1]));
        }
        //horizontal/right gap
        if (abs(grid[v][h] - grid[v][h - 1] - cost_fn(L[h - 1], ε)) < DELTA)
        {
            alignments.push(...recurse(L, R, cost_fn, grid, Q_align, H_align, h - 1, v, L[h - 1], ε));
        }
    }

    return alignments;
}
/*
 * Returns one of the optimal alignments
 * 
 * <i>for cost functions with many equal weights for all operations, the stack might overflow as the
 * number of optimal alignments approaches the total number of alignments, which is a factorial function
 * of the lenght of the paired sequences</i>
 * 
 * <i>Parameters are not validated</i>
 * 
 * @param {string|string[]} L - the left sequence
 * @param {string|string[]} R - the right sequence
 * @param {cost-fn} cost_fn - the edit operation cost function
 * @param {Array.Array.float} grid - the alignment cost grid
 * @param {Array.Array.string | Array.Array.string[]} alignment - the current partial alignment
 * @param {int} h - length of the left sequence
 * @param {int} v - length of the right sequence
 * @return {Array.Array.Array.string[]}  an  optimal alignments
 */
function edit_align(L, R, cost_fn, grid,
    alignment = [
        [],
        []
    ], h = L.length, v = R.length)
{
    if (h === 0 && v === 0) return alignment;

    const L_align = alignment[0],
        R_align = alignment[1];

    if (h === 0)
    {
        for (let k = v; k > 0; k--)
        {
            L_align.unshift(ε);
            R_align.unshift(R[k - 1]);
        }
    }
    else if (v === 0)
    {
        for (let k = h; k > 0; k--)
        {
            L_align.unshift(L[k - 1]);
            R_align.unshift(ε);
        }
    }
    else
    { //diagonal/substitution
        if (abs(grid[v][h] - grid[v - 1][h - 1] - cost_fn(L[h - 1], R[v - 1])) < DELTA)
        {
            L_align.unshift(L[h - 1]);
            R_align.unshift(R[v - 1]);
            h--;
            v--;
        } //vertical/left gap
        else if (abs(grid[v][h] - grid[v - 1][h] - cost_fn(ε, R[v - 1])) < DELTA)
        {
            L_align.unshift(ε);
            R_align.unshift(R[v - 1]);
            v--;
        } //horizontal/right gap
        else if (abs(grid[v][h] - grid[v][h - 1] - cost_fn(L[h - 1], ε)) < DELTA)
        {
            L_align.unshift(L[h - 1]);
            R_align.unshift(ε);
            h--;
        }
        else throw 'couldnt match alignment ' + L + ' ' + R + ' ' + grid[v][h];

        return edit_align(L, R, cost_fn, grid, alignment, h, v);
    }

    return [L_align, R_align];
}

/*
 * Helps implement the double recursion stragety of the multiple optimal alignment algorithm
 * @param {string|string[]} L - the left sequence
 * @param {string|string[]} R - the right sequence
 * @param {cost-fn} cost_fn - the edit operation cost function
 * @param {Array.Array.float} grid - the alignment cost grid
 * @param {*} L_align - partial left alignment
 * @param {*} R_align - partial right aligment
 * @param {int} h - length of left sequence
 * @param {int} v - length of right sequence
 * @param {int} r - row
 * @param {int} c - column
 */
function recurse(L, R, cost_fn, grid, L_align, R_align, h, v, r, c)
{
    const
        new_L_align = L_align.slice(),
        new_R_align = R_align.slice();

    new_L_align.unshift(r);
    new_R_align.unshift(c);

    return all_alignments(L, R, cost_fn, grid, [new_L_align, new_R_align], h, v);
}