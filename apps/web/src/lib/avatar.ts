export function getAvatarGradient(name: string): string {
  const gradients = [
    'from-emerald-400 to-teal-500',
    'from-purple-400 to-indigo-500',
    'from-amber-400 to-orange-500',
    'from-sky-400 to-blue-500',
    'from-rose-400 to-red-500',
    'from-fuchsia-400 to-pink-500',
  ];

  if (!name) return gradients[0]!;

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % gradients.length;
  return `bg-gradient-to-tr ${gradients[index]} text-white`;
}
