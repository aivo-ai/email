const Illustration = () => {
  return (
    <div className="illustration">
      <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
          </linearGradient>
        </defs>
        
        {/* Browser/Email window */}
        <g>
          <rect 
            x="100" 
            y="60" 
            width="200" 
            height="140" 
            rx="8" 
            fill="url(#gradient1)" 
            stroke="rgba(255,255,255,0.3)" 
            strokeWidth="2"
          />
          <rect 
            x="100" 
            y="60" 
            width="200" 
            height="25" 
            rx="8" 
            fill="rgba(255,255,255,0.1)"
          />
          <circle cx="115" cy="72" r="4" fill="rgba(255,255,255,0.5)" />
          <circle cx="130" cy="72" r="4" fill="rgba(255,255,255,0.5)" />
          <circle cx="145" cy="72" r="4" fill="rgba(255,255,255,0.5)" />
          
          {/* Email lines */}
          <line x1="115" y1="105" x2="185" y2="105" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line x1="115" y1="120" x2="165" y2="120" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line x1="115" y1="135" x2="175" y2="135" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
          <line x1="115" y1="150" x2="155" y2="150" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        </g>

        {/* User figures */}
        <g>
          {/* Left user */}
          <circle 
            cx="70" 
            cy="140" 
            r="25" 
            fill="none" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="2" 
            strokeDasharray="5,5"
            className="rotate-animation"
          />
          <circle cx="70" cy="130" r="10" fill="rgba(255,255,255,0.8)" />
          <path 
            d="M70,145 L70,180 M70,155 L55,170 M70,155 L85,170 M60,180 L70,180 L80,180" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
          
          {/* Right user */}
          <circle 
            cx="330" 
            cy="140" 
            r="25" 
            fill="none" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="2" 
            strokeDasharray="5,5"
            className="rotate-animation-reverse"
          />
          <circle cx="330" cy="130" r="10" fill="rgba(255,255,255,0.8)" />
          <path 
            d="M330,145 L330,180 M330,155 L315,170 M330,155 L345,170 M320,180 L330,180 L340,180" 
            stroke="rgba(255,255,255,0.8)" 
            strokeWidth="2" 
            strokeLinecap="round"
          />
        </g>

        {/* Connection paths */}
        <path 
          d="M95,140 Q200,100 305,140" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
          strokeDasharray="3,3"
          className="dash-animation"
        />
        <path 
          d="M95,160 Q200,200 305,160" 
          fill="none" 
          stroke="rgba(255,255,255,0.3)" 
          strokeWidth="2" 
          strokeDasharray="3,3"
          className="dash-animation-reverse"
        />
      </svg>
    </div>
  )
}

export default Illustration
