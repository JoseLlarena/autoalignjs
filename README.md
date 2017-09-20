
<h1>autoalign.js<br/></h1><br/>

<p >align paired sequences automatically</p><br/>

<p>
  <a href="https://www.npmjs.com/package/autoalign">
    <img alt="NPM" src="https://img.shields.io/npm/v/autoalign.svg?style=flat">
  </a>

  <a href="https://travis-ci.org/JoseLlarena/autoalignjs">
    <img alt="Travis Status" src="https://travis-ci.org/JoseLlarena/autoalignjs.svg?branch=master">
  </a>
<p><br/>

_autoalign_ learns to align a list of paired but unaligned sequences by alternating between estimating a cost function based on the alignment statistics, and finding the optimal alignment with respect to that estimated cost function; in other words, it learns an [edit distance](https://en.wikipedia.org/wiki/Edit_distance) from data, starting with a guess and [iterating until convergence](https://en.wikipedia.org/wiki/Expectation%E2%80%93maximization_algorithm):
```
0. guess initial cost function
              🡓
1. align sequences using cost function         🡐                      
              🡓
2. estimate co-ocurrence statistics             🡑
              🡓
3. build cost function from statistics          🡑
              🡓
4. compute avg alignment cost                   🡑
              🡓
5. if no improvement go to 6, otherwise 1      🡒
              🡓
6. returned aligned pairs
```

[Further details](#more-background)

[Full API documentation](https://josellarena.github.io/autoalignjs/module-autoalign.html)


## Install


```js
npm i autoalign
```

to uninstall:

```js
npm un autoalign
``` 

[More install options](#other-install)

## Usage

__CLI__

```shell
$ ./node_modules/.bin/autoalign -h

Usage: autoalign [options]


Options:

  -V, --version        output the version number
  -i --input <file>    input file; format: LEFT, RIGHT with white-space separated symbols
  -m --machine [file]  machine-readable output; format: LEFT, RIGHT, SCORE
  -u --human [file]    human-readable output, format: SCORE LEFT \n\r RIGHT
  -h, --help           output usage information
```

example using pronunciation dictionary [Britfone](https://github.com/JoseLlarena/Britfone) as  input:

```shell
$ ./node_modules/.bin/autoalign -i britfone.csv -m aligned.csv -u aligned.txt

[1:30:04 PM] read 15861 pairs from britfone.csv
[1:30:05 PM] avg.unnorm.cost: 2.2119283496010733
[1:30:06 PM] avg.unnorm.cost: 1.3996218560070568
[1:30:07 PM] avg.unnorm.cost: 1.383950761182861
[1:30:08 PM] avg.unnorm.cost: 1.3785348695282842
[1:30:09 PM] avg.unnorm.cost: 1.3784167544364208
[1:30:10 PM] avg.unnorm.cost: 1.3784167544364208
[1:30:11 PM] wrote 15861 alignments to aligned.csv
[1:30:11 PM] wrote 15861 alignments to aligned.txt
```

_britfone.csv_

```
... ... ...
S O L V I N G, s ɒ l v ɪ ŋ
S O M A, s əʊ m ə
S O M A L I A, s əʊ m ɑː l ɪə
S O M E, s ɐ m
... ... ...
```

_aligned.csv_
```
... .... ...
S O L V I N G, s ɒ l v ɪ · ŋ, 0.8138013477578335
S O M A, s əʊ m ə, 0.8147196394392467
S O M A L I A, s əʊ m ɑː l · ɪə, 0.7530844100226581
S O M E, s ɐ m ·, 0.7520632287232023
... .... ...
```


_aligned.txt_
```
... ... ...

0.81 S O L V I N G
     s ɒ l v ɪ · ŋ

0.81 W I  F E
     w aɪ f ·

0.81 P R O  T E I  N S
     p ɹ əʊ t · iː n z

0.81 F O  L D E R S
     f əʊ l d · ə z

... ... ...
```

__API__
```js
> aa = require('autoalign')

{ GAP: [Getter],
  BY_SCORE: [Function],
  BY_ALPHA: [Function],
  SEP: [Getter],
  UNSEEN: [Getter],
  Stats: [Getter],
  vocab_sizes: [Getter],
  joint_stats_from_alignment: [Getter],
  smoothed_stats: [Getter],
  non_zero_smoothed_stats: [Getter],
  with_zero_smoothing: [Getter],
  alignment_cost_fn_estimator: [Getter],
  padding_cost_fn_estimator: [Getter],
  uniform_cost_fn_estimator: [Getter],
  pmi_cost_fn_from: [Getter],
  npmi: [Getter],
  pmi: [Getter],
  autoalign: [Function],
  csv_text_from_alignments: [Function],
  pretty_text_from_alignments: [Function] }

> pairs = [['SOLVING', 'sɒlvɪŋ'],
... ['SOMA', ['s','əʊ','m','ə']],
... ['SOMALIA', ['s','əʊ','ɑː','l','ɪə']],
... ['SOME', 'sɐm']]

[ [ 'SOLVING', 'sɒlvɪŋ' ],
  [ 'SOMA', [ 's', 'əʊ', 'm', 'ə' ] ],
  [ 'SOMALIA', [ 's', 'əʊ', 'ɑː', 'l', 'ɪə' ] ],
  [ 'SOME', 'sɐm' ] ]

> aa.autoalign(pairs, aa.uniform_cost_fn_estimator, aa.pmi_cost_fn_from)

[ [ [ 'S', 'O', 'L', 'V', 'I', 'N', 'G' ],
    [ 's', 'ɒ', 'l', 'v', '·', 'ɪ', 'ŋ' ],
    0.9007558120763637 ],
  [ [ 'S', 'O', 'M', 'A' ],
    [ 's', 'əʊ', 'm', 'ə' ],
    0.8754834816104571 ],
  [ [ 'S', 'O', 'M', 'A', 'L', 'I', 'A' ],
    [ 's', 'əʊ', '·', 'ɑː', 'l', '·', 'ɪə' ],
    0.8098602659026892 ],
  [ [ 'S', 'O', 'M', 'E' ],
    [ 's', 'ɐ', 'm', '·' ],
    0.8158098631621633 ] ]

```
__Browser__

```html
<script src='./node_modules/autoalign/autoalign.js'></script>
```
`autoalign` will be available as a global


[Full API documentation](https://josellarena.github.io/autoalignjs/module-autoalign.html)

## <a name="more-background"></a>Background

Autoalign uses the agreggated statistics of current alignments, computed with [dynamic programming](https://en.wikipedia.org/wiki/Dynamic_programming), in order to compute a better cost function for the next alignment pass. Given two aligned strings, it counts the co-ocurrences between the aligned symbols, adding those up over all alignments in the dataset. For instance these two alignments:

```
  P R O  T E I  N S
  p ɹ əʊ t · iː n z

  F O  L D E R S
  f əʊ l d · ə z
```

will result in co-occurence counts:

```
P:p   = 1
R:ɹ   = 1
O:əʊ  = 2
T:t   = 1
E:·   = 2
I:iː  = 1
N:n   = 1
S:z   = 2
F:f   = 1
L:l   = 1
D:d   = 1
R:ə   = 1
```

These statistics are first smoothed using [good-turing](https://en.wikipedia.org/wiki/Good%E2%80%93Turing_frequency_estimation) estimation to avoid zero counts. 
Then they are used to estimate the strength of association between the symbols in the left (up) and right (down) alphabets (letters and phonemes in this example). This strength is measured with a normalised [pointwise mutual information](https://en.wikipedia.org/wiki/Pointwise_mutual_information)(NPMI) (__x__ is left and __y__ is right):

![npmi](https://github.com/JoseLlarena/autoalignjs/raw/master/docs/npmi.svg?sanitize=true)

where *__pmi(x;y)__* is

![pmi](https://github.com/JoseLlarena/autoalignjs/raw/master/docs/pmi.svg?sanitize=true)

and *__h(x, y)__* is the negative logarithm of the joint probability of the left and right symbols

(This use of __pmi__ is analogous to [log-odds ratio scoring](https://en.wikipedia.org/wiki/BLOSUM) in bioinformatics<sup>[1]</sup>).

NPMI's range is [*-1*, *1*] and so it needs renormalising as the [edit distance](https://en.wikipedia.org/wiki/Edit_distance) [alignment](https://en.wikipedia.org/wiki/Sequence_alignment) costs must be non-negative. The end result is the final cost between the symbols.

Once the new cost function is estimated, the sequences are realigned and the process starts over again, stopping once the alignment cost for the whole dataset stops decreasing. Non-increase and convergence to a local minimum are guaranted as this is an instance of the [Expectation Maximisation](https://en.wikipedia.org/wiki/Expectation%E2%80%93maximization_algorithm) algorithm, similar to [Viterbi Training](https://labrosa.ee.columbia.edu/doc/HTKBook21/node111.html) and [forced alignment](http://montreal-forced-aligner.readthedocs.io/en/latest/introduction.html#what-is-forced-alignment) in Speech Recognition. 


_autoalign_ is limited in three ways:

- it only matches one symbol in the left alphabet to one symbol in the right alphabet alignment. This one-to-one alignment is inaccure for orthographic/phonetic sequences as phones and letters are often in a many-to-many correspondence. For tools that don't have this limitation see [Related](#related)

- it only uses the optimal alignment(s) to compute the counts, this misses the contribution of less likely aligments and makes the algorithm very sentitive to initial conditions<sup>[2]</sup><sup>[3]</sup>. For tools that use the full set of paths see [Related](#related)

- it can only compute monotonic alignments. This is not a problem for most linguistic data, with a notable exception being machine translation

\[1\] [Biological Sequence Analysis](https://books.google.co.uk/books?id=HUUhAwAAQBAJ), Durbin, Eddy, Krogh & Mitchison, 1998.

\[2\] [Applying Many-to-Many Alignments and Hidden Markov Models to Letter-to-Phoneme Conversion](http://www.aclweb.org/anthology/N/N07/N07-1047.pdf), Jiampojamarn, Kondrak & Sherif, 2007.

\[3\] [Learning String Distance] (http://pnylab.com/pny/papers/sed/sed.pdf), Ristad & Yianilos, 1998.

## NPM tasks

test
```shell
npm test
```
 
## <a name="other-install"></a>Other install options

__global npm install:__

```js
npm i -g autoalign
npm ln autoalign //ensures module is availabe to nodejs
```
then cli is, e.g. `autoalign -i britfone.csv -m aligned.csv -u aligned.txt`
and `npm un -g autoalign` to uninstall

__library-only git install:__

```shell
git clone git@github.com:josellarena/autoalignjs.git
cd autoalignjs
```

then in node `require('./autoalign)`

and in the browser `<script src='autoalign.js'></script>`


##  <a name="related"></a>Related
[M2MAligner](https://github.com/letter-to-phoneme/m2m-aligner) - A [HMM](https://en.wikipedia.org/wiki/Hidden_Markov_model)-based aligner that can also do many-to-many alignments

[AltFstAligner](https://github.com/AdolfVonKleist/AltFstAligner) - Another [HMM](https://en.wikipedia.org/wiki/Hidden_Markov_model)-based aligner, an intended replacement for M2MAligner

## See Also

[Britfone](https://github.com/JoseLlarena/Britfone) - a British English phonetic dictionary. 

_In order to autoalign Britfone, the word column needs to be processed such that letters are separated by whitespace_

## Changelog

see [Changelog](https://github.com/JoseLlarena/autoalignjs/blob/master/CHANGELOG.md)

## License

MIT © [Jose Llarena](https://www.npmjs.com/~josellarena)
 