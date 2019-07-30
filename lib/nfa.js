'use strict';

/**
 * Through called an NFA due to the given transitions, only the transition
 * with highest precedence is visited, so it's deterministic.
 **/

// constructor

function NFA() {
  // alphabets are encoded by numbers in 16^N form, presenting its precedence
  this.__highest_alphabet__ = 0x0;
  this.__match_alphabets__ = {};
  // states are union (bitwise OR) of its accepted alphabets
  this.__start_state__ = 0x0;
  this.__accept_states__ = {};
  // flags are manually set in execute method
  this.__accept_flag__ = false;
  this.__reject_flag__ = false;
  // transitions are in the form: {prev_state: {alphabet: next_state}}
  this.__transitions__ = {};
  // actions take two parameters: step (line number), prev_state and alphabet
  this.__actions__ = {};
}

// setters

NFA.prototype.set_highest_alphabet = function (alphabet) {
  this.__highest_alphabet__ = alphabet;
};

NFA.prototype.set_match_alphabets = function (matches) {
  this.__match_alphabets__ = matches;
};

NFA.prototype.set_start_state = function (start) {
  this.__start_state__ = start;
};

NFA.prototype.set_accept_states = function (accepts) {
  for (var i = 0; i < accepts.length; i++) {
    this.__accept_states__[accepts[i]] = true;
  }
};

NFA.prototype.set_transitions = function (transitions) {
  this.__transitions__ = transitions;
};

NFA.prototype.set_actions = function (actions) {
  this.__actions__ = actions;
};

// methods

NFA.prototype.accept = function () {
  this.__accept_flag__ = true;
};

NFA.prototype.reject = function () {
  this.__reject_flag__ = true;
};

NFA.prototype.execute = function (start, end) {
  var state, step, alphabet;
  for (state = this.__start_state__, step = start; state && step < end; step++) {
    for (alphabet = this.__highest_alphabet__; alphabet > 0x0; alphabet >>= 4) {
      if ((state & alphabet)
          && this.__match_alphabets__[alphabet].call(this, step, state, alphabet)) { break; }
    }

    this.__actions__(step, state, alphabet);

    if (this.__accept_flag__) return true;
    if (this.__reject_flag__) return false;
    state = this.__transitions__[state][alphabet] || 0x0;
  }
  return !!this.__accept_states__[state];
};

module.exports = NFA;

/* vim: set ts=2 sw=2 et: */
