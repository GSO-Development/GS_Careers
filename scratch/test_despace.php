<?php
// Test 3-step de-spacing algorithm revision 2
$lines = [
    "N  A  D  U  M  I   P  R  A  T  H  I  B  H  A",
    "M  a  l  a  b  e  ,  S  r  i   L  a  n  k  a   /   n  a  d  u  j  a  y  y  2  0  @  g  m  a  i  l  .  c  o  m",
    "/   0  7  6  9  4  4  6  1  0  6",
    "M  o  t  i  v  a  t  e  d   B  S  c   (  H  o  n  s  )   S  o  f  t  w  a  r  e   y  n  g  i  n  e  e  r  i  n  g   u  n  d  e  r  g  r  a  d  u  a  t  e"
];

foreach ($lines as $l) {
    // Step 1: Replace word boundaries (3 or more spaces) with ' | '
    $step1 = preg_replace('/[ \t]{3,}/', ' | ', $l);
    // Step 2: Remove letter boundaries (1 or 2 spaces between single chars)
    $step2 = preg_replace('/(?<=[a-zA-Z0-9()\/\.,\-+@])[ \t]{1,2}(?=[a-zA-Z0-9()\/\.,\-+@])/', '', $step1);
    // Step 3: Replace word boundary markers ' | ' with single space ' '
    $out = str_replace(' | ', ' ', $step2);

    echo "IN : $l\n";
    echo "OUT: $out\n\n";
}
