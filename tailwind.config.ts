import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			elevated: 'hsl(var(--card))',
  			subtle: 'hsl(var(--muted))',
  			'subtle-foreground': 'hsl(var(--muted-foreground))',
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))',
  				hover: 'hsl(var(--primary-hover))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))',
  				hover: 'hsl(var(--secondary-hover))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))',
  				soft: 'hsl(var(--destructive-soft))',
  				text: 'hsl(var(--destructive-text))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))',
  				hover: 'hsl(var(--muted-hover))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))',
  				hover: 'hsl(var(--accent-hover))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))',
  				hover: 'hsl(var(--card-hover))'
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
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))',
  				soft: 'hsl(var(--success-soft))',
  				text: 'hsl(var(--success-text))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))',
  				soft: 'hsl(var(--warning-soft))',
  				text: 'hsl(var(--warning-text))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))',
  				soft: 'hsl(var(--info-soft))',
  				text: 'hsl(var(--info-text))'
  			},
  			pending: {
  				DEFAULT: 'hsl(var(--pending))',
  				foreground: 'hsl(var(--pending-foreground))',
  				soft: 'hsl(var(--pending-soft))',
  				text: 'hsl(var(--pending-text))'
  			},
  			neutral: {
  				soft: 'hsl(var(--neutral-soft))',
  				text: 'hsl(var(--neutral-text))'
  			},
  			purple: {
  				DEFAULT: 'hsl(var(--purple))',
  				foreground: 'hsl(var(--purple-foreground))',
  				soft: 'hsl(var(--purple-soft))',
  				text: 'hsl(var(--purple-text))'
  			},
  			orange: {
  				DEFAULT: 'hsl(var(--orange))',
  				foreground: 'hsl(var(--orange-foreground))',
  				soft: 'hsl(var(--orange-soft))',
  				text: 'hsl(var(--orange-text))'
  			},
  			cyan: {
  				DEFAULT: 'hsl(var(--cyan))',
  				foreground: 'hsl(var(--cyan-foreground))',
  				soft: 'hsl(var(--cyan-soft))',
  				text: 'hsl(var(--cyan-text))'
  			},
  			pink: {
  				DEFAULT: 'hsl(var(--pink))',
  				foreground: 'hsl(var(--pink-foreground))',
  				soft: 'hsl(var(--pink-soft))',
  				text: 'hsl(var(--pink-text))'
  			},
  			amber: {
  				DEFAULT: 'hsl(var(--amber))',
  				foreground: 'hsl(var(--amber-foreground))',
  				soft: 'hsl(var(--amber-soft))',
  				text: 'hsl(var(--amber-text))'
  			},
  			'priority-high': {
  				DEFAULT: 'hsl(var(--priority-high))',
  				soft: 'hsl(var(--priority-high-soft))',
  				text: 'hsl(var(--priority-high-text))'
  			},
  			'priority-medium': {
  				DEFAULT: 'hsl(var(--priority-medium))',
  				soft: 'hsl(var(--priority-medium-soft))',
  				text: 'hsl(var(--priority-medium-text))'
  			},
  			'priority-low': {
  				DEFAULT: 'hsl(var(--priority-low))',
  				soft: 'hsl(var(--priority-low-soft))',
  				text: 'hsl(var(--priority-low-text))'
  			},
  			gray: {
  				'50': 'hsl(var(--gray-50))',
  				'100': 'hsl(var(--gray-100))',
  				'200': 'hsl(var(--gray-200))',
  				'300': 'hsl(var(--gray-300))',
  				'400': 'hsl(var(--gray-400))',
  				'500': 'hsl(var(--gray-500))',
  				'600': 'hsl(var(--gray-600))',
  				'700': 'hsl(var(--gray-700))',
  				'800': 'hsl(var(--gray-800))',
  				'900': 'hsl(var(--gray-900))'
  			}
  		},
  		zIndex: {
  			dropdown: 'var(--z-dropdown)',
  			sticky: 'var(--z-sticky)',
  			modal: 'var(--z-modal)',
  			popover: 'var(--z-popover)',
  			tooltip: 'var(--z-tooltip)',
  			toast: 'var(--z-toast)',
  			overlay: 'var(--z-overlay)'
  		},
  		transitionProperty: {
  			smooth: 'all'
  		},
  		transitionDuration: {
  			DEFAULT: '150ms'
  		},
  		transitionTimingFunction: {
  			DEFAULT: 'ease-in-out'
  		},
  		boxShadow: {
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		borderRadius: {
  			sm: 'var(--radius-sm)',
  			DEFAULT: 'var(--radius-md)',
  			md: 'var(--radius-md)',
  			lg: 'var(--radius-lg)',
  			xl: 'var(--radius-xl)'
  		},
  		fontSize: {
  			metadata: 'var(--text-metadata)',
  			'body-sm': 'var(--text-body-sm)',
  			body: 'var(--text-body)',
  			'heading-sm': 'var(--text-heading-sm)',
  			'heading-md': 'var(--text-heading-md)',
  			'heading-lg': 'var(--text-heading-lg)',
  			'page-title': 'var(--text-page-title)'
  		},
  		spacing: {
  			'1': 'var(--spacing-1)',
  			'2': 'var(--spacing-2)',
  			'3': 'var(--spacing-3)',
  			'4': 'var(--spacing-4)',
  			'6': 'var(--spacing-6)',
  			'8': 'var(--spacing-8)',
  			'12': 'var(--spacing-12)',
  			'16': 'var(--spacing-16)',
  			'24': 'var(--spacing-24)',
  			'48': '12rem',
  			xxs: 'var(--space-xxs)',
  			xs: 'var(--space-xs)',
  			sm: 'var(--space-sm)',
  			md: 'var(--space-md)',
  			lg: 'var(--space-lg)',
  			xl: 'var(--space-xl)',
  			'2xl': 'var(--space-2xl)',
  			card: 'var(--space-card)',
  			section: 'var(--space-2xl)'
  		},
  		height: {
  			'row-compact': 'var(--row-compact)',
  			'row-default': 'var(--row-default)',
  			'row-comfortable': 'var(--row-comfortable)'
  		},
  		minHeight: {
  			'row-compact': 'var(--row-compact)',
  			'row-default': 'var(--row-default)',
  			'row-comfortable': 'var(--row-comfortable)'
  		},
  		margin: {
  			section: 'var(--space-2xl)',
  			card: 'var(--space-lg)'
  		},
  		gap: {
  			xs: 'var(--space-xs)',
  			sm: 'var(--space-sm)',
  			md: 'var(--space-md)',
  			lg: 'var(--space-lg)',
  			xl: 'var(--space-xl)',
  			'2xl': 'var(--space-2xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0',
  					opacity: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				},
  				to: {
  					height: '0',
  					opacity: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0'
  				},
  				'100%': {
  					opacity: '1'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					transform: 'scale(0.95)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'slide-up': {
  				'0%': {
  					transform: 'translateY(10px)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateY(0)',
  					opacity: '1'
  				}
  			},
  			'pulse-subtle': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.8'
  				}
  			},
  			'shimmer': {
  				'0%': {
  					backgroundPosition: '-1000px 0'
  				},
  				'100%': {
  					backgroundPosition: '1000px 0'
  				}
  			},
  			'slide-in-right': {
  				'0%': {
  					transform: 'translateX(100%)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'translateX(0)',
  					opacity: '1'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  			'accordion-up': 'accordion-up 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  			'fade-in': 'fade-in 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  			'scale-in': 'scale-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'slide-up': 'slide-up 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  			'pulse-subtle': 'pulse-subtle 2s ease-in-out infinite',
  			'shimmer': 'shimmer 2s infinite linear',
  			'slide-in-right': 'slide-in-right 300ms cubic-bezier(0.34, 1.56, 0.64, 1)'
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			serif: [
  				'Lora',
  				'ui-serif',
  				'Georgia',
  				'Cambria',
  				'Times New Roman',
  				'Times',
  				'serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
