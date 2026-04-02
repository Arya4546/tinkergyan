import { Prisma, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

const adminUser = {
  name: 'Admin User',
  email: 'admin@tinkergyan.dev',
  password: 'AdminPass123',
};

const courses = [
  {
    slug: 'getting-started-with-arduino',
    title: 'Getting Started with Arduino',
    description: 'Learn the basics of Arduino boards, pins, and first circuits.',
    difficulty: 'BEGINNER' as const,
    isPublished: true,
    order: 1,
    modules: [
      {
        title: 'Arduino Basics',
        order: 1,
        lessons: [
          {
            title: 'Meet Your Arduino',
            content: 'Introduction to Arduino boards, pins, and basic setup.',
            type: 'READING' as const,
            order: 1,
            xpReward: 10,
          },
          {
            title: 'Blink Your First LED',
            content: 'Write your first sketch to blink the onboard LED.',
            type: 'CODING' as const,
            starterCode: `void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH);\n  delay(1000);\n  digitalWrite(LED_BUILTIN, LOW);\n  delay(1000);\n}\n`,
            order: 2,
            xpReward: 15,
          },
        ],
      },
    ],
  },
  {
    slug: 'digital-inputs',
    title: 'Digital Inputs and Buttons',
    description: 'Read button presses and control outputs with logic.',
    difficulty: 'BEGINNER' as const,
    isPublished: true,
    order: 2,
    modules: [
      {
        title: 'Buttons and Input',
        order: 1,
        lessons: [
          {
            title: 'Using Digital Read',
            content: 'Understand how to read a digital pin and respond in code.',
            type: 'READING' as const,
            order: 1,
            xpReward: 10,
          },
          {
            title: 'Button Controlled LED',
            content: 'Wire a button and control an LED with simple logic.',
            type: 'CODING' as const,
            starterCode:
              'const int buttonPin = 2;\nconst int ledPin = 13;\n\nvoid setup() {\n  pinMode(buttonPin, INPUT_PULLUP);\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  int buttonState = digitalRead(buttonPin);\n  digitalWrite(ledPin, buttonState == LOW ? HIGH : LOW);\n}\n',
            order: 2,
            xpReward: 15,
          },
        ],
      },
    ],
  },
  {
    slug: 'analog-sensors',
    title: 'Analog Sensors',
    description: 'Explore analog inputs with sensors like potentiometers.',
    difficulty: 'INTERMEDIATE' as const,
    isPublished: true,
    order: 3,
    modules: [
      {
        title: 'Analog Signals',
        order: 1,
        lessons: [
          {
            title: 'Reading Analog Values',
            content: 'Use analogRead to read sensor values.',
            type: 'READING' as const,
            order: 1,
            xpReward: 12,
          },
          {
            title: 'Dim an LED with a Potentiometer',
            content: 'Map analog input values to PWM output.',
            type: 'CODING' as const,
            starterCode:
              'const int sensorPin = A0;\nconst int ledPin = 9;\n\nvoid setup() {\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  int sensorValue = analogRead(sensorPin);\n  int outputValue = map(sensorValue, 0, 1023, 0, 255);\n  analogWrite(ledPin, outputValue);\n}\n',
            order: 2,
            xpReward: 18,
          },
        ],
      },
    ],
  },
];

const badges = [
  {
    slug: 'first-project',
    title: 'First Project',
    description: 'Created your first project.',
    icon: 'spark',
    triggerType: 'FIRST_PROJECT' as const,
  },
  {
    slug: 'first-compile',
    title: 'First Compile',
    description: 'Compiled your first program.',
    icon: 'bolt',
    triggerType: 'FIRST_COMPILE' as const,
  },
  {
    slug: 'course-complete',
    title: 'Course Complete',
    description: 'Completed a full course.',
    icon: 'trophy',
    triggerType: 'COURSE_COMPLETE' as const,
  },
  {
    slug: 'streak-7',
    title: '7-Day Streak',
    description: 'Learned for 7 days in a row.',
    icon: 'flame',
    triggerType: 'STREAK_7' as const,
  },
  {
    slug: 'xp-100',
    title: '100 XP',
    description: 'Earned 100 XP.',
    icon: 'star',
    triggerType: 'XP_100' as const,
  },
];

const templates = [
  {
    title: 'Blink LED',
    description: 'Blink the onboard LED every second.',
    type: 'BLOCK' as const,
    boardTarget: 'arduino:avr:uno',
    code:
      'void setup() {\\n  pinMode(LED_BUILTIN, OUTPUT);\\n}\\n\\nvoid loop() {\\n  digitalWrite(LED_BUILTIN, HIGH);\\n  delay(1000);\\n  digitalWrite(LED_BUILTIN, LOW);\\n  delay(1000);\\n}\\n',
    blockState: null,
  },
  {
    title: 'Button Input',
    description: 'Read a button and control an LED.',
    type: 'BLOCK' as const,
    boardTarget: 'arduino:avr:uno',
    code:
      'const int buttonPin = 2;\\nconst int ledPin = 13;\\n\\nvoid setup() {\\n  pinMode(buttonPin, INPUT_PULLUP);\\n  pinMode(ledPin, OUTPUT);\\n}\\n\\nvoid loop() {\\n  int buttonState = digitalRead(buttonPin);\\n  digitalWrite(ledPin, buttonState == LOW ? HIGH : LOW);\\n}\\n',
    blockState: null,
  },
];

const seed = async () => {
  const passwordHash = await bcrypt.hash(adminUser.password, SALT_ROUNDS);

  await prisma.user.create({
    data: {
      name: adminUser.name,
      email: adminUser.email,
      passwordHash,
      role: 'ADMIN',
      preferences: {
        create: {
          theme: 'SYSTEM',
          editorFontSize: 14,
          defaultBoard: 'arduino:avr:uno',
          autoSave: true,
          codeCompletion: true,
          emailNotifications: true,
        },
      },
    },
  });

  for (const course of courses) {
    await prisma.course.create({
      data: {
        slug: course.slug,
        title: course.title,
        description: course.description,
        difficulty: course.difficulty,
        isPublished: course.isPublished,
        order: course.order,
        modules: {
          create: course.modules.map((module) => ({
            title: module.title,
            order: module.order,
            lessons: {
              create: module.lessons.map((lesson) => ({
                title: lesson.title,
                content: lesson.content,
                type: lesson.type,
                starterCode: lesson.starterCode ?? null,
                order: lesson.order,
                xpReward: lesson.xpReward,
              })),
            },
          })),
        },
      },
    });
  }

  for (const badge of badges) {
    await prisma.badge.create({ data: badge });
  }

  for (const template of templates) {
    await prisma.projectTemplate.create({
      data: {
        ...template,
        blockState: template.blockState ?? Prisma.JsonNull,
      },
    });
  }
};

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
