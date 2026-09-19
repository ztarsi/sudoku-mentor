const palette = require('tailwindcss/colors');
const plugin = require('tailwindcss/plugin');

// Two complete themes from one set of class names (paper-theme spec).
// Every shade of the palettes below is a CSS variable: the dark theme holds
// Tailwind's own values, and [data-theme="paper"] holds the scale turned
// over (50 <-> 950, 100 <-> 900, ...) so light text becomes dark text and
// dark surfaces become light ones. Slate, the app's chrome, gets a warm
// paper scale of its own; `white` becomes ink.
const SCALES = ['slate', 'gray', 'zinc', 'stone', 'red', 'orange', 'amber', 'yellow', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'pink', 'rose'];
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const PAPER_SLATE = {
  950: '#fbf9f4', 900: '#f4f1ea', 800: '#e9e5db', 700: '#d6d1c4', 600: '#a8a294', 500: '#7a7466',
  400: '#5c574c', 300: '#444037', 200: '#2f2c26', 100: '#211f1b', 50: '#17150f',
};
const INK = '#17150f';
const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const themedColors = Object.fromEntries(
  SCALES.map((scale) => [scale, Object.fromEntries(SHADES.map((shade) => [shade, `rgb(var(--c-${scale}-${shade}) / <alpha-value>)`]))])
);
themedColors.white = 'rgb(var(--c-white) / <alpha-value>)';
const themeVariables = () => {
  const dark = { '--c-white': '255 255 255' };
  const paper = { '--c-white': rgb(INK) };
  for (const scale of SCALES) {
    for (const shade of SHADES) {
      dark[`--c-${scale}-${shade}`] = rgb(palette[scale][shade]);
      const flipped = 1000 - shade;
      paper[`--c-${scale}-${shade}`] = rgb(scale === 'slate' ? PAPER_SLATE[shade] : palette[scale][flipped]);
    }
  }
  return { ':root': dark, '[data-theme="paper"]': paper };
};

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			...themedColors,
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(({ addBase }) => addBase(themeVariables())),
  ],
}