#!/usr/bin/env node
import { autoalign, uniform_cost_fn_estimator, pmi_cost_fn_from } from './';
import { csv_text_from_alignments, pretty_text_from_alignments, BY_ALPHA, BY_SCORE } from './';
import { readFileSync, writeFile } from 'fs';

import program from 'commander';

const { log: out, error } = console;

program
    .version('1.0.0')
    .name('autoalign')
    .option('-i --input <file>', 'input file; format: LEFT, RIGHT with white-space separated symbols')
    .option('-m --machine [file]', 'machine-readable output; format: LEFT, RIGHT, SCORE')
    .option('-u --human [file]', 'human-readable output, format: SCORE LEFT \\n\\r RIGHT')
    .parse(process.argv);

if (!program.input)
{
    error('\nNo file input given. Try again.');
    program.help();
}

if (program.human === true)
{
    error('\nhuman output file is empty. Try again.');
    program.help();
}

if (program.machine === true)
{
    error('\machine output file is empty. Try again.');
    program.help();
}

const pairs = pairs_from(program.input);
to_console('input', `read ${pairs.length} pairs from ${program.input}`);

const alignments = autoalign(pairs, uniform_cost_fn_estimator, pmi_cost_fn_from, to_console);

if (program.machine)
{
    text_to(program.machine, csv_text_from_alignments(alignments.sort(BY_ALPHA)));
    to_console('output', `wrote ${alignments.length} alignments to ${program.machine}`);
}

if (program.human)
{
    text_to(program.human, pretty_text_from_alignments(alignments.sort(BY_SCORE)));
    to_console('output', `wrote ${alignments.length} alignments to ${program.human}`);
}

if (!program.machine && !program.human)
{
    out(pretty_text_from_alignments(alignments.sort(BY_SCORE)));
    to_console('output', `wrote ${alignments.length} alignments to console`);
}
/*
 * Writes to the given file, the given text string
 * 
 * @param {str} file - the file to write to
 * @param {str} text - the text to be written to the file
 */
function text_to(file, text)
{
    writeFile(file, text, err =>
    {
        if (err)
        {
            error(err);
            process.exit(-1);
        }
    });

    return file;
}
/*
 * Reads pairs of aligned sequences from csv file.
 * Each line in the file should have two comma-separated columns: the first one is the left string, and the second the right string.
 * both should be formatted as a white-separated sequence of symbols, not excluding white-sapces
 * 
 * @param {str} file - the file to read the sequences from
 */
export function pairs_from(file)
{
    const valid_row = /^\s*[^\s,]+(\s+[^\s,]+)*?\s*,\s*[^\s,]+(\s+[^\s,]+)*?\s*$/,
        separator = ',';

    return readFileSync(file, 'utf8')
        .split('\n')
        .map(line =>
        {
            if (!line) return null;

            if (!valid_row.test(line)) throw { name: 'Invalid Row Structure', message: `row has an invalid structure: ${line}` };

            return line.split(separator).map(column => column.match(/\S+/g));
        })
        .filter(Boolean);
}

function to_console(topic, val)
{
    if (topic === 'cost')
        out(`[${new Date().toLocaleTimeString()}] avg.unnorm.cost: ${val}`);
    else if (topic === 'output' || topic === 'input')
        out(`[${new Date().toLocaleTimeString()}] ${val}`);
}