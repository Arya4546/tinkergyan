/**
 * seed.ts
 *
 * Seeds the database with an "Arduino Basics" starter course.
 * Run with: npx prisma db seed
 *
 * Idempotent — uses upsert so it can be re-run safely.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Course ──────────────────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where:  { slug: 'arduino-basics' },
    update: {},
    create: {
      slug:        'arduino-basics',
      title:       'Arduino Basics',
      description: 'Learn the fundamentals of Arduino programming — from blinking LEDs to reading sensors. Perfect for absolute beginners.',
      difficulty:  'BEGINNER',
      isPublished: true,
      order:       1,
    },
  });

  // ── Module 1: Getting Started ───────────────────────────────────────────
  const m1 = await prisma.module.upsert({
    where:  { id: 'mod-getting-started' },
    update: {},
    create: {
      id:       'mod-getting-started',
      courseId: course.id,
      title:   'Getting Started',
      order:   1,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-what-is-arduino' },
    update: {},
    create: {
      id:       'les-what-is-arduino',
      moduleId: m1.id,
      title:    'What is Arduino?',
      type:     'READING',
      order:    1,
      xpReward: 10,
      content: `# What is Arduino?

Arduino is an **open-source electronics platform** based on easy-to-use hardware and software. It consists of a physical board (a microcontroller) and a development environment for writing code.

## Why Arduino?

- **Beginner-friendly**: No prior electronics experience needed
- **Affordable**: Boards cost as little as ₹500
- **Huge community**: Millions of projects and tutorials online
- **Cross-platform**: Works on Windows, Mac, and Linux

## The Arduino Board

The most popular board is the **Arduino Uno**. It has:

- **14 digital I/O pins** (6 with PWM)
- **6 analog input pins**
- **USB connection** for programming
- **Power jack** for external power

## Your First Program

Every Arduino program has two key functions:

\`\`\`cpp
void setup() {
  // Runs once when the board starts
}

void loop() {
  // Runs repeatedly forever
}
\`\`\`

In the next lesson, you'll write your first real program!`,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-blink-led' },
    update: {},
    create: {
      id:       'les-blink-led',
      moduleId: m1.id,
      title:    'Blink an LED',
      type:     'CODING',
      order:    2,
      xpReward: 20,
      starterCode: `// Blink the built-in LED on pin 13
void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  // TODO: Turn the LED off and wait another second
}
`,
      content: `# Blink an LED

The "Hello World" of Arduino! Let's make an LED blink on and off.

## The Circuit

The Arduino Uno has a **built-in LED** connected to pin 13. No external wiring needed!

## The Code

We use three key functions:
- \`pinMode(pin, mode)\` — Set a pin as INPUT or OUTPUT
- \`digitalWrite(pin, value)\` — Set a pin HIGH (on) or LOW (off)
- \`delay(ms)\` — Wait for a number of milliseconds

## Your Task

Complete the code to make the LED blink:
1. Turn the LED **OFF** using \`digitalWrite(13, LOW)\`
2. Wait **1 second** using \`delay(1000)\`

## Expected Output

When you run this code, you should see the simulated LED toggling every second:
\`\`\`
[SIM] digitalWrite(13, HIGH)
[SIM] digitalWrite(13, LOW)
\`\`\`

Try it in the editor on the right! 👉`,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-variables' },
    update: {},
    create: {
      id:       'les-variables',
      moduleId: m1.id,
      title:    'Variables & Data Types',
      type:     'READING',
      order:    3,
      xpReward: 15,
      content: `# Variables & Data Types

Variables are containers that store values in your program's memory.

## Common Data Types

| Type | Size | Range | Example |
|:-----|:-----|:------|:--------|
| \`int\` | 2 bytes | -32,768 to 32,767 | \`int count = 0;\` |
| \`long\` | 4 bytes | -2B to 2B | \`long bigNum = 100000;\` |
| \`float\` | 4 bytes | Decimals | \`float temp = 36.5;\` |
| \`bool\` | 1 byte | true/false | \`bool isOn = true;\` |
| \`char\` | 1 byte | Single character | \`char grade = 'A';\` |
| \`String\` | varies | Text | \`String name = "TinkerGyan";\` |

## Naming Rules

- Start with a letter or underscore
- No spaces (use camelCase: \`myVariable\`)
- Case-sensitive (\`count\` ≠ \`Count\`)

## Constants

Use \`const\` for values that never change:
\`\`\`cpp
const int LED_PIN = 13;
const float PI_VALUE = 3.14159;
\`\`\`

## Practice

Try declaring variables in the next coding lesson!`,
    },
  });

  // ── Module 2: Digital I/O ───────────────────────────────────────────────
  const m2 = await prisma.module.upsert({
    where:  { id: 'mod-digital-io' },
    update: {},
    create: {
      id:       'mod-digital-io',
      courseId: course.id,
      title:   'Digital I/O',
      order:   2,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-digital-output' },
    update: {},
    create: {
      id:       'les-digital-output',
      moduleId: m2.id,
      title:    'Digital Output',
      type:     'CODING',
      order:    1,
      xpReward: 20,
      starterCode: `// Traffic Light Simulator
// Use pins 10 (Red), 11 (Yellow), 12 (Green)

const int RED = 10;
const int YELLOW = 11;
const int GREEN = 12;

void setup() {
  pinMode(RED, OUTPUT);
  pinMode(YELLOW, OUTPUT);
  pinMode(GREEN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  // Green ON for 3 seconds
  digitalWrite(GREEN, HIGH);
  Serial.println("GO!");
  delay(3000);
  digitalWrite(GREEN, LOW);

  // TODO: Yellow ON for 1 second, then off
  // TODO: Red ON for 3 seconds, then off
}
`,
      content: `# Digital Output

Digital output lets you control external devices like LEDs, buzzers, and relays.

## How It Works

Digital pins can be either **HIGH** (5V) or **LOW** (0V):
- \`HIGH\` = Pin outputs 5 volts (LED turns on)
- \`LOW\` = Pin outputs 0 volts (LED turns off)

## Traffic Light Challenge

Build a traffic light using three LEDs:
1. 🟢 Green ON for 3 seconds
2. 🟡 Yellow ON for 1 second
3. 🔴 Red ON for 3 seconds
4. Repeat!

## Your Task

Complete the \`loop()\` function to add the Yellow and Red light phases.`,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-digital-input' },
    update: {},
    create: {
      id:       'les-digital-input',
      moduleId: m2.id,
      title:    'Digital Input (Buttons)',
      type:     'CODING',
      order:    2,
      xpReward: 20,
      starterCode: `// Button-controlled LED
const int BUTTON_PIN = 2;
const int LED_PIN = 13;

void setup() {
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(LED_PIN, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int buttonState = digitalRead(BUTTON_PIN);

  if (buttonState == LOW) {
    // Button is pressed (INPUT_PULLUP inverts logic)
    digitalWrite(LED_PIN, HIGH);
    Serial.println("Button PRESSED - LED ON");
  } else {
    digitalWrite(LED_PIN, LOW);
    Serial.println("Button RELEASED - LED OFF");
  }

  delay(100);
}
`,
      content: `# Digital Input — Buttons

Reading digital input lets your Arduino respond to the physical world!

## INPUT_PULLUP

When you use \`INPUT_PULLUP\`, the pin reads **HIGH** by default and goes **LOW** when pressed. This eliminates the need for an external resistor.

## The Code

\`\`\`cpp
pinMode(BUTTON_PIN, INPUT_PULLUP);
int state = digitalRead(BUTTON_PIN);
// state == LOW when pressed
// state == HIGH when released
\`\`\`

## Try It

Run the code and watch the Serial output toggle between PRESSED and RELEASED!`,
    },
  });

  // ── Module 3: Serial Communication ──────────────────────────────────────
  const m3 = await prisma.module.upsert({
    where:  { id: 'mod-serial-comms' },
    update: {},
    create: {
      id:       'mod-serial-comms',
      courseId: course.id,
      title:   'Serial Communication',
      order:   3,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-serial-basics' },
    update: {},
    create: {
      id:       'les-serial-basics',
      moduleId: m3.id,
      title:    'Serial Monitor Basics',
      type:     'CODING',
      order:    1,
      xpReward: 15,
      starterCode: `// Serial Monitor Demo
void setup() {
  Serial.begin(9600);
  Serial.println("=== TinkerGyan Serial Lab ===");
  Serial.println();
}

void loop() {
  // Print a counter
  static int count = 0;
  count++;

  Serial.print("Count: ");
  Serial.println(count);

  delay(500);
}
`,
      content: `# Serial Monitor Basics

The Serial Monitor is your window into what the Arduino is thinking!

## Setting Up

\`\`\`cpp
Serial.begin(9600);  // Start serial at 9600 baud
\`\`\`

## Printing

| Function | Does |
|:---------|:-----|
| \`Serial.print()\` | Print without newline |
| \`Serial.println()\` | Print with newline |

## Baud Rate

Baud rate is the speed of communication. **9600** is the standard for beginners. Both the Arduino and Serial Monitor must use the same baud rate!

## Try It

Run the code to see the counter incrementing in the output panel!`,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-analog-read' },
    update: {},
    create: {
      id:       'les-analog-read',
      moduleId: m3.id,
      title:    'Analog Reading & Voltage',
      type:     'CODING',
      order:    2,
      xpReward: 25,
      starterCode: `// Analog Sensor Reader with Voltage Calculation
void setup() {
  Serial.begin(9600);
  Serial.println("=== Analog Sensor Lab ===");
}

void loop() {
  int rawValue = analogRead(A0);
  float voltage = rawValue * (5.0 / 1023.0);

  Serial.print("Raw: ");
  Serial.print(rawValue);
  Serial.print(" | Voltage: ");
  Serial.print(voltage);
  Serial.println("V");

  delay(250);
}
`,
      content: `# Analog Reading & Voltage

While digital pins read HIGH or LOW, **analog pins** read a range of values (0–1023).

## How It Works

The Arduino's ADC (Analog-to-Digital Converter) maps 0–5V to 0–1023:
- 0V → 0
- 2.5V → 512
- 5V → 1023

## Voltage Formula

\`\`\`cpp
float voltage = analogRead(A0) * (5.0 / 1023.0);
\`\`\`

## Common Sensors

| Sensor | Signal |
|:-------|:-------|
| Potentiometer | 0–5V (0–1023) |
| Light sensor (LDR) | Varies with light |
| Temperature (TMP36) | 10mV per °C |

## Challenge

Run the code and observe the simulated analog values!`,
    },
  });

  console.log(`✅ Seeded course: "${course.title}" (${course.slug})`);
  console.log(`   3 modules, 7 lessons`);

  // ── Course 2: C++ Fundamentals ──────────────────────────────────────────
  const course2 = await prisma.course.upsert({
    where:  { slug: 'cpp-fundamentals' },
    update: {},
    create: {
      slug:        'cpp-fundamentals',
      title:       'C++ Fundamentals',
      description: 'Master core C++ concepts — variables, control flow, functions, and arrays. Build a solid foundation for embedded programming.',
      difficulty:  'INTERMEDIATE',
      isPublished: true,
      order:       2,
    },
  });

  const m4 = await prisma.module.upsert({
    where:  { id: 'mod-cpp-basics' },
    update: {},
    create: {
      id:       'mod-cpp-basics',
      courseId: course2.id,
      title:   'C++ Basics',
      order:   1,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-cpp-hello' },
    update: {},
    create: {
      id:       'les-cpp-hello',
      moduleId: m4.id,
      title:    'Hello World in C++',
      type:     'CODING',
      order:    1,
      xpReward: 15,
      starterCode: `#include <iostream>

int main() {
    std::cout << "Hello, TinkerGyan!" << std::endl;
    // TODO: Print your name on the next line
    return 0;
}
`,
      content: `# Hello World in C++

Every programmer's journey begins here!

## The Structure

\`\`\`cpp
#include <iostream>  // Input/Output library

int main() {           // Entry point
    std::cout << "Hello!" << std::endl;
    return 0;           // Success
}
\`\`\`

## Key Concepts

- \`#include\` brings in libraries
- \`main()\` is where execution starts
- \`std::cout\` prints to the console
- \`<<\` is the insertion operator
- \`std::endl\` adds a newline

## Your Task

Modify the code to also print your name!`,
    },
  });

  await prisma.lesson.upsert({
    where:  { id: 'les-cpp-loops' },
    update: {},
    create: {
      id:       'les-cpp-loops',
      moduleId: m4.id,
      title:    'Loops & Control Flow',
      type:     'CODING',
      order:    2,
      xpReward: 25,
      starterCode: `#include <iostream>

int main() {
    // For loop: Print 1 to 5
    for (int i = 1; i <= 5; i++) {
        std::cout << "Count: " << i << std::endl;
    }

    // TODO: Add a while loop that counts from 10 down to 1

    return 0;
}
`,
      content: `# Loops & Control Flow

Loops let you repeat actions without writing the same code over and over.

## For Loop

\`\`\`cpp
for (int i = 0; i < 10; i++) {
    // Runs 10 times
}
\`\`\`

## While Loop

\`\`\`cpp
int count = 5;
while (count > 0) {
    count--;  // Decrement
}
\`\`\`

## Your Task

Add a while loop that counts down from 10 to 1!`,
    },
  });

  console.log(`✅ Seeded course: "${course2.title}" (${course2.slug})`);
  console.log(`   1 module, 2 lessons`);

  // ── Badges ────────────────────────────────────────────────────────────────
  const badgeData = [
    { slug: 'first-project',   title: 'Tinkerer',    description: 'Created your first project',          icon: '🔧', triggerType: 'FIRST_PROJECT'   as const },
    { slug: 'first-compile',   title: 'Hello World',  description: 'Compiled code for the first time',    icon: '⚡', triggerType: 'FIRST_COMPILE'   as const },
    { slug: 'course-complete', title: 'Graduate',     description: 'Completed an entire course',          icon: '🎓', triggerType: 'COURSE_COMPLETE' as const },
    { slug: 'xp-100',          title: 'Scholar',      description: 'Reached 100 XP',                     icon: '📚', triggerType: 'XP_100'          as const },
    { slug: 'streak-7',        title: 'On Fire',      description: 'Maintained a 7-day streak',           icon: '🔥', triggerType: 'STREAK_7'        as const },
  ];

  for (const b of badgeData) {
    await prisma.badge.upsert({
      where:  { slug: b.slug },
      update: {},
      create: b,
    });
  }

  console.log(`✅ Seeded ${badgeData.length} badges`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
