'use strict';

function slugify(text) {
  // NOTICE may replaced with below in version 5.0.0
  // var sanitized = text.trim().toLowerCase().replace(/\s+/g, '-');
  // return encodeURIComponent(sanitized);
  return text.toLowerCase().replace(/\W+/g, '');
}

exports.slugify = slugify;
