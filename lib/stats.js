 import * as gt from './good-turing';
 const { NEGATIVE_INFINITY, POSITIVE_INFINITY } = Number, { round, sqrt, min, max, floor, ceil, abs, log, pow } = Math, { keys } = Object;

 export const
     /** 
      * the separator between left and right symbols, when used as a unit, unicode plus-minus-sign  U+00B1
      * @const
      * @type {string} 
      * @default
      */
     SEP = '±';
 export const
     /**
      * represents the unseen symbol, three times the unicode diaeresis  +U+00A8
      * @const
      * @type {string}  
      * @default
      */
     UNSEEN = '¨¨¨';

 const
     ε = '·',
     undef = _ => typeof _ === 'undefined';

 /*
  * Map from symbols to counts
  */
 export class Stats
 {
     /*
      * @param {Object.<str, float>} counts - initial counts
      */
     constructor(counts = {})
     {
         for (const key of keys(counts))
         {
             this[key] = (this[key] || 0) + counts[key];
         }
     }

     /*
      * increases key's count by n
      * @param {str} key - symbol to add count to
      * @param {float} [n=1], count to add, 1 if missing
      * @return {Stats} this
      */
     inc(key, n = 1)
     {
         this[key] = (this[key] || 0) + n;
         return this;
     }

     /*
      * @returns {int} number of keys
      */
     size()
     {
         return this.keys().length;
     }

     /*
      * remove all keys and their counts
      * @return {Stats} this
      */
     reset()
     {
         for (const key of this.keys())
         {
             delete this[key];
         }
         return this;
     }

     /*
      * @returns {string[]} an array wth all keys
      */
     keys()
     {
         return keys(this);
     }
 }

 /*
  * Computes the sizes of the left, right and combined alphabets
  * @param {Pair[]} pairs - An array of pairs of sequences, each as a 2-element array; the sequences can be a strings or an array of strings
  * @return {int[]} an array with the vocabulary size of the left-right combinations, the left alphabet and the right alphabet
  */
 export function vocab_sizes(pairs)
 {
     const duos = new Set();

     for (const [L, R] of pairs)
     {
         for (const r of L)
         {
             for (const c of R)
             {
                 duos.add(r + SEP + c);
             }
         }
     }

     const l_vocab = new Set(),
         r_vocab = new Set();

     for (const duo of duos)
     {
         const [left, right] = duo.split(SEP);

         l_vocab.add(left);
         r_vocab.add(right);
     }

     return [(l_vocab.size + 1) * (r_vocab.size + 1) - 1, l_vocab.size + 1, r_vocab.size + 1];
 }
 /*
  * Adds co-ocurrence counts in alignment to passed int stats
  * 
  * @param {Array.string[]} alignment - an 2-element array containing the left alignment and the right alignment
  * @param {Stats} stats - the aggregated alignment statistics
  * @param {int} [n=1] - the number of optimal alignments, to properly weight in case there's more than one
  * @return {Stats} the updated statistics
  */
 export function joint_stats_from_alignment(alignment, stats, n = 1)
 {
     for (let i = 0, len = alignment[0].length; i < len; i++)
     {
         const duo = alignment[0][i] + SEP + alignment[1][i];

         stats.inc(duo, 1 / n);
     }

     return stats;
 }
 /*
  * Computes the smoothed joint, left and right co-ocurrence counts, plus the count of unseen
  * left-right symbol combinations and the total counts
  * 
  * @param {Stats} emp_joint_stats - the left-right symbol joint counts
  * @param {int[]} vocab_sizes  - the joint, left and right vocabulary sizes
  */
 export function smoothed_stats(emp_joint_stats, vocab_sizes)
 {
     const smoothed_joint_counts = gt.simple(freq_of_counts(emp_joint_stats));

     const [joints, lefts, rights, N] = non_zero_smoothed_stats(emp_joint_stats, smoothed_joint_counts);

     return with_zero_smoothing([joints, lefts, rights], vocab_sizes).concat([N]);
 }
 /*
  * Computes counts for joints, lefts and rights that have above-zero empirical counts
  * 
  * @param {Stats} emp_joint_stats - the left-right symbol joint counts
  * @param {Object.<float,float>} smooth_joint_counts - the Good-Turing-smoothed counts, a moap from raw counts to smoothed ones
  * @return {Array} - array with joint, left and right stats, plus the total counts
  */
 export function non_zero_smoothed_stats(emp_joint_stats, smooth_joint_counts)
 {
     const
         duos = emp_joint_stats.keys(),
         smooth_joint_stats = new Stats(),
         smooth_left_stats = new Stats(),
         smooth_right_stats = new Stats();

     let N = smooth_joint_counts[0];

     for (const duo of duos)
     {
         const smooth_count = smooth_joint_counts[emp_joint_stats[duo]];
         smooth_joint_stats[duo] = smooth_count;
         N += smooth_count;

         const [left, right] = duo.split(SEP);

         smooth_left_stats.inc(left, smooth_count); // = (smooth_left_stats[left] || 0) + smooth_count;
         smooth_right_stats.inc(right, smooth_count);
     }

     return [smooth_joint_stats, smooth_left_stats, smooth_right_stats, N];
 }

 //for use in the rare case where there are 0 1-count pairs, as good-turing will give 0-count pairs the same counts as 1-count pairs
 const MIN_TOTAL_COUNT = 1;
 /*
  * Adds counts for unseen synmbols to the smoothed counts for those found in the alignment pass
  * @param {Array.Stats} param0 - smoothed joint, left and right counts
  * @param {Array.int} param1 - joint, left and right vocabulary sizes
  * @param {float} counts_for_zero - total counts for unseen left-right symbol combinations
  * @returns {Array} array with joint, left and right stats, plus the per-symbol left-right unseen counts
  */
 export function with_zero_smoothing([joint_stats, l_stats, r_stats], [duo_n, left_n, right_n], counts_for_zero)
 {
     const
         emp_duo_n = joint_stats.size();

     const unseen_count = (counts_for_zero || MIN_TOTAL_COUNT) / (duo_n - emp_duo_n);
     joint_stats[UNSEEN] = unseen_count;

     const
         right_coocurrences = {},
         left_coocurrences = {};

     for (const duo of joint_stats.keys())
     {
         const [left, right] = duo.split(SEP);

         if (undef(left_coocurrences[right])) left_coocurrences[right] = new Set();
         left_coocurrences[right].add(left);

         if (undef(right_coocurrences[left])) right_coocurrences[left] = new Set();
         right_coocurrences[left].add(right);
     }

     //adds zero mass to marginal counts so that their Ns are equal to the joints'
     for (const left of l_stats.keys()) l_stats.inc(left, (right_n - (left === ε) - right_coocurrences[left].size) * unseen_count);
     for (const right of r_stats.keys()) r_stats.inc(right, (left_n - (right === ε) - left_coocurrences[right].size) * unseen_count);

     return [joint_stats, l_stats, r_stats, unseen_count];
 }

 /*
  * Computes the frequences of each count
  * 
  * @param {Stats} counts - the stats with the counts, a map from symbols to counts
  * @returns {Stats} the frequencies of counts as a map from count to frequency
  */
 function freq_of_counts(counts)
 {
     const count_to_freq = new Stats();

     for (const symbol of counts.keys())     
     {
         const count = counts[symbol];
         count_to_freq.inc(count);
     }

     return count_to_freq;
 }