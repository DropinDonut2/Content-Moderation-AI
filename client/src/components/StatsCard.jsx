function StatsCard({ title, value, icon, color = 'default', subtitle }) {
    // Minimalist Palette - Only B&W by default, color only for critical status
    const colorStyles = {
        default: 'border-white/10 text-white',
        primary: 'border-white/10 text-white',
        success: 'border-green-500/20 text-green-400',
        warning: 'border-amber-500/20 text-amber-400',
        danger: 'border-red-500/20 text-red-500',
    };

    const isColor = color === 'success' || color === 'danger' || color === 'warning';

    return (
        <div className={`
      relative p-6 border bg-black transition-all duration-200
      hover:border-white/30 group
      ${colorStyles[color]}
    `}>
            <div className="flex justify-between items-start mb-4">
                <p className="text-xs font-bold uppercase tracking-wider text-text-secondary group-hover:text-white transition-colors">
                    {title}
                </p>
                <div className={`opacity-50 group-hover:opacity-100 transition-opacity ${isColor ? '' : 'text-white'}`}>
                    {icon}
                </div>
            </div>

            <h3 className="text-3xl font-bold tracking-tighter font-mono mb-1">{value}</h3>

            {subtitle && (
                <p className="text-[10px] uppercase tracking-widest text-text-secondary font-mono border-t border-white/5 pt-2 mt-2">
                    {subtitle}
                </p>
            )}
        </div>
    );
}

export default StatsCard;
