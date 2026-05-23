/**
 * console-messages.ts
 *
 * Rotating motivational messages for the compile console.
 * Child-friendly, encouraging tone — errors are puzzles, not failures.
 */

export interface ConsoleMessage {
  icon: string;
  title: string;
  message: string;
}

// ─── Success Messages ─────────────────────────────────────────────────────────

const SUCCESS_MESSAGES: ConsoleMessage[] = [
  { icon: '🎉', title: 'Nailed it! Your code is perfect!', message: 'Wow, that compiled without a single problem! Your Arduino is ready to roll. You\'re turning into a real engineer — keep going!' },
  { icon: '🚀', title: 'Liftoff! Code compiled successfully!', message: 'Houston, we have a program! Everything looks great. Your circuit is about to come alive. Ready to upload?' },
  { icon: '⚡', title: 'Zap! Compiled in a flash!', message: 'Like lightning! Your code is clean, crisp, and ready. One more step and your LED will blink for real. Amazing work!' },
  { icon: '🌟', title: 'Superstar code right there!', message: 'Zero errors. Zero warnings. This is what clean code looks like! You should be proud — that\'s real Arduino magic.' },
  { icon: '🏆', title: 'Champion-level compile!', message: 'Your code passed every check. Brilliant! This is exactly how professional embedded engineers work. Go team!' },
  { icon: '🎯', title: 'Bullseye! Perfect compile!', message: 'Right on target! Your code is ready to make hardware do cool things. The compiler loves your work!' },
  { icon: '💎', title: 'Gem of a program!', message: 'Clean, elegant, and error-free. You\'re writing code like a pro. Diamonds are made under pressure — you just made one!' },
  { icon: '🦾', title: 'Robot-approved code!', message: 'If robots could high-five, they would right now. Your code compiled perfectly and is ready for action!' },
  { icon: '🔥', title: 'Your code is on fire!', message: 'Not literally — but it\'s hot! Clean compile, zero issues. You\'re building real skills here. Keep that momentum!' },
  { icon: '🧪', title: 'Experiment successful!', message: 'Like a scientist in a lab, you just proved your hypothesis. The code works! Time to observe the results.' },
  { icon: '🎸', title: 'Rock star code!', message: 'Your code just hit all the right notes. No errors, no warnings — a perfect performance. Encore!' },
  { icon: '🌈', title: 'Beautiful code ahead!', message: 'After every challenge comes a rainbow. Your compile is clean and your project is ready to shine!' },
  { icon: '🧠', title: 'Big brain energy!', message: 'Your logical thinking is top-notch. The compiler had nothing to complain about. That\'s pure skill!' },
  { icon: '✨', title: 'Sparkling clean compile!', message: 'Not a speck of dust in this code. Everything is polished, tested, and ready to go. You\'re a natural!' },
  { icon: '🎪', title: 'The greatest show in code!', message: 'Step right up! Your program compiled flawlessly. The hardware is waiting for its star performer!' },
];

// ─── Error Messages ───────────────────────────────────────────────────────────

const ERROR_MESSAGES: ConsoleMessage[] = [
  { icon: '🔍', title: 'Ooh, a tiny puzzle to solve!', message: 'No worries at all — even the world\'s best programmers get errors every day! Errors are just clues. Let\'s decode this one together.' },
  { icon: '🛠️', title: 'Your code needs a small tune-up!', message: 'Great try! You\'re super close — there\'s just one little thing the compiler wants you to fix. Think of it like a treasure hunt!' },
  { icon: '🧩', title: 'One missing piece — you\'ve got this!', message: 'Imagine building LEGO — sometimes one piece is in the wrong spot. That\'s all this is! Errors make you a better coder.' },
  { icon: '🌈', title: 'Almost there, keep going!', message: 'Did you know? Every programmer, including the people who built your favourite video games, gets errors like this. It\'s totally normal!' },
  { icon: '💡', title: 'Error = learning moment!', message: 'You just found a bug! That makes you a real bug-hunter. Debugging is one of the most important skills in coding.' },
  { icon: '🗺️', title: 'Detour on the coding road!', message: 'Every great journey has a few wrong turns. This error is just a detour — your destination is still ahead. Let\'s reroute!' },
  { icon: '🎨', title: 'Time to touch up the masterpiece!', message: 'Even Picasso made sketches before the final painting. This error is just part of your creative process!' },
  { icon: '🏗️', title: 'Building in progress!', message: 'The best buildings need strong foundations. This error is helping you build better code. Let\'s fix it and keep stacking!' },
  { icon: '🌱', title: 'Growing stronger with every fix!', message: 'Plants don\'t grow in a straight line, and neither does code. Every error you fix makes your programming skills bloom!' },
  { icon: '🎮', title: 'Level up opportunity!', message: 'In video games, challenges make you stronger. This error is your chance to earn XP in real coding skills!' },
  { icon: '🔬', title: 'Scientist mode: activated!', message: 'Real scientists love when experiments don\'t go as planned — that\'s when discoveries happen! Let\'s investigate this one.' },
  { icon: '🧙', title: 'Even wizards need practice!', message: 'The greatest coding wizards got there by facing errors head-on. This spell just needs a small tweak!' },
  { icon: '🎯', title: 'So close to the target!', message: 'Your arrow landed right next to the bullseye. A tiny adjustment and you\'ll hit the mark. Let\'s aim again!' },
  { icon: '🐛', title: 'Bug spotted — let\'s squash it!', message: 'Fun fact: the first computer bug was an actual moth! Your bug is much easier to fix. Let\'s go!' },
  { icon: '⚓', title: 'Anchoring your knowledge!', message: 'This error is actually teaching you something valuable. Once you fix it, you\'ll never make the same mistake again!' },
];

// ─── Warning Messages ─────────────────────────────────────────────────────────

const WARNING_MESSAGES: ConsoleMessage[] = [
  { icon: '🟡', title: 'Your code works, but here\'s a tip!', message: 'Good news — your code compiled! There\'s just a small suggestion from the compiler to make your code even better.' },
  { icon: '✨', title: 'Compiled! A little polish available:', message: 'Nice work! The code will run fine as-is. The warning below is just the compiler being extra helpful — like a teacher\'s bonus tip!' },
  { icon: '🎓', title: 'Compiled! Pro tip unlocked:', message: 'Your code is working! Warnings aren\'t errors — they\'re tips from the compiler to level up your skills.' },
  { icon: '📝', title: 'A note from your compiler friend:', message: 'Everything compiled fine! The compiler just left a sticky note with a suggestion. Take a look when you\'re ready.' },
  { icon: '🔔', title: 'Gentle reminder from the compiler:', message: 'Your program is ready to run! These warnings are just friendly nudges to help you write even cleaner code.' },
];

// ─── Timeout Messages ─────────────────────────────────────────────────────────

const TIMEOUT_MESSAGES: ConsoleMessage[] = [
  { icon: '⏳', title: 'That one took a while — let\'s fix it!', message: 'Your code ran for a long time and we had to stop it safely. This usually means there\'s an infinite loop. Don\'t stress — it\'s an easy fix!' },
  { icon: '🌀', title: 'Looks like your code got a bit loopy!', message: 'Sometimes code runs forever — it\'s actually a super common beginner thing! Check if your loop() has a delay() or a stopping condition.' },
  { icon: '🐌', title: 'Slow and steady... but too slow!', message: 'Your code was taking longer than 30 seconds. Usually this means a loop without a break. Add a delay() inside your loop!' },
  { icon: '🎡', title: 'Round and round it goes!', message: 'Like a ferris wheel that won\'t stop — your code kept going in circles. Let\'s add a way for it to take a breath between cycles.' },
];

// ─── Error Hint Translations ──────────────────────────────────────────────────

const ERROR_HINTS: { pattern: RegExp; hint: string }[] = [
  { pattern: /expected ';'/i, hint: 'Looks like a missing semicolon! Every statement in C++ needs to end with a ; character.' },
  { pattern: /undeclared identifier/i, hint: 'This variable hasn\'t been introduced yet. Declare it at the top with something like: int name = value;' },
  { pattern: /was not declared in this scope/i, hint: 'Make sure this variable or function is spelled exactly right — C++ is case-sensitive! "digitalWrite" ≠ "digitalwrite"' },
  { pattern: /too few arguments/i, hint: 'This function needs more information! Check the Arduino docs for how many values it expects.' },
  { pattern: /no matching function/i, hint: 'The function name might have a small typo, or you\'re passing the wrong type of value. Check the spelling!' },
  { pattern: /expected primary-expression/i, hint: 'Something is out of place nearby. Check for missing brackets (), {}, or a misplaced operator.' },
  { pattern: /multiple definition/i, hint: 'You\'ve named two things the same. Each variable or function needs a unique name.' },
  { pattern: /expected '\}'/i, hint: 'You\'re missing a closing curly brace }. Every { needs a matching } — count them up!' },
  { pattern: /expected '\{'/i, hint: 'You need an opening curly brace { here. Functions and if-statements need { to start their code block.' },
  { pattern: /expected '\)'/i, hint: 'A closing parenthesis ) is missing. Check that every ( has a matching ).' },
  { pattern: /invalid type/i, hint: 'The data type doesn\'t match what\'s expected. Make sure you\'re using the right type (int, float, String, etc.).' },
  { pattern: /cannot convert/i, hint: 'You\'re trying to use one type of data where another is expected. Try casting it: (int)myValue or String(myNumber).' },
  { pattern: /redefinition/i, hint: 'This name is already taken! You declared the same variable or function twice. Rename one of them.' },
  { pattern: /use of undeclared/i, hint: 'The compiler doesn\'t know what this name means. Did you forget to declare it, or is there a typo?' },
];

// ─── Quick Hints (static reference) ───────────────────────────────────────────

export const QUICK_HINTS = [
  { title: 'Missing semicolon', tip: 'Every line of code (except blocks like if/for) needs a ; at the end.' },
  { title: 'Case sensitivity', tip: 'C++ cares about uppercase/lowercase. "Serial" ≠ "serial".' },
  { title: 'setup() and loop()', tip: 'Every Arduino sketch needs both setup() and loop() functions.' },
  { title: 'Pin modes', tip: 'Always call pinMode(pin, OUTPUT/INPUT) in setup() before using a pin.' },
  { title: 'Serial.begin()', tip: 'Call Serial.begin(9600) in setup() before using Serial.print().' },
  { title: 'Curly braces', tip: 'Every { must have a matching }. Indent your code to spot missing ones.' },
  { title: 'Variable scope', tip: 'Variables declared inside {} only exist inside those braces.' },
  { title: 'delay() units', tip: 'delay(1000) = 1 second. The number is in milliseconds.' },
  { title: 'int overflow', tip: 'int can only hold -32768 to 32767. Use long for bigger numbers.' },
  { title: 'String vs char', tip: 'Use double quotes "hello" for Strings, single quotes \'h\' for single chars.' },
];

// ─── Compile Step Labels ──────────────────────────────────────────────────────

export const COMPILE_STEPS = [
  { icon: '📦', label: 'Packing your code...' },
  { icon: '🔍', label: 'Checking for mistakes...' },
  { icon: '⚙️', label: 'Building for your board...' },
  { icon: '✅', label: 'Almost done...' },
];

// ─── Motivational Footnotes ───────────────────────────────────────────────────

const SUCCESS_FOOTNOTES = [
  'Every time you compile clean code, a light blinks somewhere in the world ✨',
  'Fun fact: the Arduino Uno has processed billions of blinks since 2010 🌍',
  'You just did what real engineers do every day. Respect! 🫡',
  'Clean compile = happy hardware. Your board is smiling right now 😊',
];

const ERROR_FOOTNOTES = [
  'Every error you fix is a skill you keep forever 💪',
  'The best programmers in the world debug more than they code 🔧',
  'Bugs are just features waiting to be understood 🐛',
  'Thomas Edison failed 1,000 times before the lightbulb. You\'ve got this! 💡',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function getSuccessMessage(): ConsoleMessage & { footnote: string } {
  return { ...pickRandom(SUCCESS_MESSAGES), footnote: pickRandom(SUCCESS_FOOTNOTES) };
}

export function getErrorMessage(): ConsoleMessage & { footnote: string } {
  return { ...pickRandom(ERROR_MESSAGES), footnote: pickRandom(ERROR_FOOTNOTES) };
}

export function getWarningMessage(): ConsoleMessage {
  return pickRandom(WARNING_MESSAGES);
}

export function getTimeoutMessage(): ConsoleMessage {
  return pickRandom(TIMEOUT_MESSAGES);
}

export function getFriendlyHint(errorMessage: string): string | null {
  for (const { pattern, hint } of ERROR_HINTS) {
    if (pattern.test(errorMessage)) return hint;
  }
  return null;
}
