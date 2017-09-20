'use strict';
const {describe, it} = require('mocha');
const {should} = require('chai').should();
const {check, gen} = require('mocha-testcheck');
const {vocab_sizes, joint_stats_from_alignment, non_zero_smoothed_stats, with_zero_smoothing, GAP, SEP, UNSEEN, Stats} = require('./autoalign.js');

const {min, max, floor, ceil, abs} = Math, {log} = console, {keys} = Object;

describe('stats', _ =>
{
    it('computes vocabulary sizes', function()
    {
        vocab_sizes([['ab','xy'], ['ca','xxz']])
            .should.eql([15, 4, 4]);
    });

    it('computes stats from alignment', function()
    {
        joint_stats_from_alignment([['a','b'], ['x', GAP]], new Stats({['a'+SEP+'x']: 1}))
            .should.eql(new Stats({['a'+SEP+'x']: 2, ['b'+SEP+GAP]: 1}));
    });

    it('smooths stats from empirical counts and smoothed joint counts', function()
    {
        non_zero_smoothed_stats(new Stats({['a'+SEP+'x']: 2, ['b'+SEP+GAP]: 1}), {2: .5, 1: 1.5, 0: 1})

            .should.eql(
                [new Stats({['a'+SEP+'x']: .5, ['b'+SEP+GAP]: 1.5}), new Stats({a: .5, b: 1.5}), new Stats({x: .5, [GAP]: 1.5}), 3]);
    });

    it('smooths stats with zero counts', function()
    {
        const ax = 'a'+SEP+'x', by = 'b'+SEP+'y', gapz = GAP+SEP+'z';
        
        const in_stats = [
            new Stats({[ax]: .5, [by]: .75, [gapz]: .75}),
            new Stats({a: .5, b: .75, [GAP]: .75}),
            new Stats({x: .5, y: .75, z: .75})];

        const out_stats = [
                new Stats({[ax]: .5, [by]: .75, [gapz]: .75, [UNSEEN]: 2/8}),
                new Stats({a: .5 + 3*2/8, b: .75 + 3*2/8, [GAP]: .75 + 2*2/8}),
                new Stats({x: .5 + 2*2/8, y: .75 + 2*2/8, z: .75 + 2*2/8}),
                2/8];

        with_zero_smoothing(in_stats, [11, 3, 4], 2).should.eql(out_stats);
    });
    
});
