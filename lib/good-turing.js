module.exports = (function()
{	
	'use strict';

	const {keys} = Object, {log , exp , sqrt, abs} = Math, sq = x => x*x, undef = obj => typeof obj === 'undefined';	

	const o =
	{
		/**
		 * 	<p>Smooths provided counts or gives their smoothed probability using the classic Simple Good-Turing algorithm
		 *  as described in	{@link http://diskworld.wharton.upenn.edu/~foster/teaching/data_mining/good_turing.pdf|Gale et al (1995)} and
		 *  following the implementation in {@link http://www.grsampson.net/D_SGT.c|Dennis et al (2008)}<br>
		 *	For performance reasons, parameters are not validated.</p>
		 *	@alias module:goodturing#simple	
		 *	@public
		 *	@readonly
		 *	@param {!dict.<integer,integer>} count_freq - A map from raw counts to their frequencies. 	
		 *	@param {...integer} count_freq.1..inf - The raw count with its frequency. Zero counts must not be included.
		 *	@param {!boolean} [probs=false] - Flag to indicate whether smoothed probabilities or smoothed counts should be returned.
		 *	@param {!float} [crit=1.96] - <p>Level of significance as critical value for the two-tailed test for choosing between Turing and Linear Good-Turing frequency estimators<br><br>
		 *	The Turing estimator uses the raw frequency as given in count_freq, whereas the Linear Good-Turing (LGT) one uses a smoothed transformation.<br>
		 *	The algorithm will switch from Turing to LGT if the latter is sufficiently different from the former. This is tested with a two-tailed test <br>
		 *	for the difference between both estimators,	using the crit parameter as the critical value. The larger the value the more likely it is <br>
		 *	that it will switch to LGT. The default value of 1.96 corresponds to a 95% level of significance</p>
		 *	@returns {dict.<integer,float>} - <p>A map from raw counts (as passed in the count_freq parameter) to their corresponding smoothed counts or probabilites.<br>
		 *	The zero counts/probabilites are the combined values for all unseen symbols</p>
		 */		
		simple(count_freq, probs = false, crit = 1.96)
		{
 			const counts = keys(count_freq).sort((a, b) => +a > +b ? 1: +a < +b? -1 : 0), n = counts.length;
 			const log_reg = o._log_regression(o._count_avg_freq(count_freq, counts, n));  

			const smoothed_counts = {0: count_freq[1] || 0}; 	
 
			let N = 0 , non_zero_N = 0;			  				

			for(let i = 0, use_good_turing = false; i < n; i++)
			{
				const c = +counts[i], f = count_freq[c],  linear_good_turing = (c+1)*log_reg(c+1)/log_reg(c);	
 				if(use_good_turing)
				{
					smoothed_counts[c] = linear_good_turing; 
				}
				else if(undef(count_freq[c+1]))
				{
					smoothed_counts[c] = linear_good_turing; 
					use_good_turing = true;
				}				
				else if(!use_good_turing)
				{  		
					const ff = count_freq[c+1], turing = (c+1)* ff/f;  

					if(abs(turing - linear_good_turing) <= crit * sqrt( sq(c+1) * ff/sq(f) * (1+ff/f) ))
					{
						smoothed_counts[c] =  linear_good_turing;	
						use_good_turing = true;
					}					
					else
					{
						smoothed_counts[c] = turing;		
					}	
				} 

				N += c * f;
				non_zero_N += smoothed_counts[c] * f;  
			}	 						 
 
			if(probs === true)
			{
				return o._as_stg_probs(smoothed_counts, counts, n, N, non_zero_N);
			}					 

			return smoothed_counts;
		},
		/** calculates smoothed probabilities from the counts smoothed in the simple good-turing function */
		_as_stg_probs(smoothed_counts, counts, n, N, non_zero_N)
		{
			smoothed_counts[0] /= N;
			const norm = (1 - smoothed_counts[0])/non_zero_N;

			for(let i = 0; i < n; i++)
			{
				const c = +counts[i];
				smoothed_counts[c] = norm*smoothed_counts[c];   
			}

			return smoothed_counts;
		},
		/** transforms the counts' frequencies into an averaged value to allow proper interpolation by the log regression function */ 
		_count_avg_freq(count_freq, counts, n)
		{
			const count_avg_freq = {[counts[0]]: count_freq[counts[0]]/(.5*counts[1])};		
			
			for(let i = 1; i < n-1; i++ )
			{
				const c = counts[i];				
			 
				count_avg_freq[c] = count_freq[c]/(.5*(counts[i+1] - counts[i-1]));	 	 
			}

			count_avg_freq[counts[n-1]] = count_freq[counts[n-1]]/(counts[n-1] - counts[n-2]);

			return count_avg_freq; 
		},
		/**
		 *	returns regression function that predicts the frequency (dependent y-variable) of the 
		 *	given count (independent x-value), by creating a regression line of frequency on count in log-space
		 */
		_log_regression(count_freq)
		{
			const counts = keys(count_freq);
			let avg_counts = 0, avg_freqs = 0, avg_sq_counts = 0, avg_prod = 0;

			for(const count of counts)
			{
				const c = log(+count), f = log(count_freq[count]);
				avg_counts += c;
				avg_freqs += f;
				avg_prod += c*f;
				avg_sq_counts += c*c;								
			}

			const n = counts.length;
			avg_counts /= n; // <x>
			avg_freqs /= n; // <y>			
			avg_prod /= n; // <xy>
			avg_sq_counts /= n; // <x^2>			

			const slope = (avg_prod - avg_counts*avg_freqs) / (avg_sq_counts - avg_counts*avg_counts);
			const intercept = avg_freqs - slope*avg_counts; 

			return count => exp(intercept + slope*log(count));
		}
	};

	return o;
}());