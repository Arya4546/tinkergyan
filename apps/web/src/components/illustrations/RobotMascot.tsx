export const RobotMascot = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`relative ${className}`}>
      {/* We use the existing sprite but add animation classes */}
      <img
        src="/sprites/robot png.png"
        alt="Stemmantra Robot"
        className="w-full h-auto drop-shadow-2xl animate-float"
        style={{ filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.2))' }}
      />
    </div>
  );
};
