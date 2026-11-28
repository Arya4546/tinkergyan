/**
 * compat — Python modules that make the browser's MicroPython behave like the
 * Python students learn (and that DSA solutions are written for).
 *
 * The worker writes these files into the engine's /lib folder. A file named
 * _tg_<name>.py completes the built-in module <name>: it is loaded the first
 * time a program imports <name> (see the import hook in python.worker.ts), so a
 * program that never imports it pays nothing. Other files are new modules.
 */
import collectionsPy from './_tg_collections.py?raw';
import functoolsPy from './_tg_functools.py?raw';
import heapqPy from './_tg_heapq.py?raw';
import itertoolsPy from './_tg_itertools.py?raw';
import mathPy from './_tg_math.py?raw';
import operatorPy from './_tg_operator.py?raw';
import randomPy from './_tg_random.py?raw';
import sysPy from './_tg_sys.py?raw';
import timePy from './_tg_time.py?raw';
import rePy from './_tg_re.py?raw';
import aiPy from './ai.py?raw';
import bisectPy from './bisect.py?raw';
import dataclassesPy from './dataclasses.py?raw';
import queuePy from './queue.py?raw';
import typingPy from './typing.py?raw';

/** File name in /lib → contents. */
export const COMPAT_FILES: Record<string, string> = {
  '_tg_collections.py': collectionsPy,
  '_tg_functools.py': functoolsPy,
  '_tg_heapq.py': heapqPy,
  '_tg_itertools.py': itertoolsPy,
  '_tg_math.py': mathPy,
  '_tg_operator.py': operatorPy,
  '_tg_random.py': randomPy,
  '_tg_re.py': rePy,
  '_tg_sys.py': sysPy,
  '_tg_time.py': timePy,
  'ai.py': aiPy,
  'bisect.py': bisectPy,
  'dataclasses.py': dataclassesPy,
  'queue.py': queuePy,
  'typing.py': typingPy,
};

/** Import name → the built-in module it completes (utime is time's old name). */
export const COMPAT_MODULES: Record<string, string> = {
  collections: 'collections',
  functools: 'functools',
  heapq: 'heapq',
  itertools: 'itertools',
  math: 'math',
  operator: 'operator',
  random: 'random',
  re: 're',
  sys: 'sys',
  time: 'time',
  utime: 'time',
};
