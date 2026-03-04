const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: 'jit',
  darkMode: 'class',
  // These paths are just examples, customize them to match your project structure
  content: ['./src/**/**/*.{js,jsx,ts,tsx,mdx}'],
  theme: {
    colors: {
      black: '#000000',
      white: '#ffffff',
      offWhite: '#EBEBEB',
      primary: '#DAC4FF',
      secondary: '#B4FA64',
      tertiary: '#F4F0ED',
      // base
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      // Scopes
      scope: {
        1: '',
        2: '',
        3: '',
      },
      // anthrazits
      an: {
        10: '#E9EAEA',
        20: '#D3D5D8',
        40: '#A7ABAD',
        60: '#7B8184',
        // can also be used instead of #606474
        80: '#4F575B',
        90: '#3C4245',
        100: '#232D32',
      },
      // greens
      green: {
        10: '#F2FAF3',
        100: '#7CCD87',
      },
      softGreen: {
        10: '#EFF7F5',
        60: '#9FCFC2',
        100: '#5FAF9A',
      },
      red: {
        10: '#FEEEF0',
        100: '#F4516C',
      },
      gray: {
        5: '#F9F9F9',
        10: '#EBEBEB',
        20: '#E4E4E4',
      },
      sfblue: {
        10: '#EDF1FC',
        20: '#DBE2F0',
        40: '#B7C5F4',
        60: '#92A9EE',
        80: '#6E8CE9',
        100: '#4A6FE3',
      },
      sforange: {
        5: '#fef3f1',
        10: '#FFF4F1',
        20: '#FFE9E3',
        40: '#FED3C7',
        60: '#FEBCAB',
        80: '#FEA68F',
        100: '#FD9073',
      },
      sfgreen: {
        10: '#EFF7F5',
        20: '#DFEFEB',
        40: '#BFDFD7',
        60: '#9FCFC2',
        80: '#7FBFAE',
        100: '#5FAF9A',
      },
      sfgray: {
        5: '#F9F9F9',
        10: '#F4F4F6',
        20: '#E8E9ED',
        40: '#D2D4DB',
        60: '#BBBEC9',
        80: '#A5A9B7',
        100: '#8E93A5',
      },
      sfpurple: {
        10: '#F8F5FD',
        20: '#EBE3F0',
        40: '#DFD2ED',
        60: '#D2C0EC',
        80: '#C5AEE9',
        100: '#B89DE7',
      },
      pink: {
        10: '#FEF4FF',
        20: '#FCEAFF',
        40: '#F9D5FF',
        60: '#F7BFFF',
        80: '#F4AAFF',
        100: '#F195FF',
      },
      lime: {
        10: '#F8FFEF',
        20: '#F0FEE0',
        40: '#E1FDC1',
        60: '#D2FCA2',
        80: '#C3FB83',
        100: '#B4FA64',
      },
      // rebranding colors 2025
      lilac: {
        10: '#FBF9FF',
        20: '#F8F3FF',
        40: '#F0E7FF',
        60: '#E9DCFF',
        80: '#EBDBFE',
        100: '#DAC4FF',
      },
      morningsun: {
        40: '#FFFCE5',
        100: '#FEF8BD',
      },
      coral: {
        10: '#FFF7F4',
        100: '#FFAF94',
      },
      darkgreen: {
        10: '#E5E9E8',
        25: '#BFC9C5',
        50: '#80928A',
        75: '#405C50',
        100: '#002616',
      },
      blue: {
        100: '#5D47FF',
        10: '#EFEDFF',
      },
      coolgray: {
        10: '#DFE3F2',
        60: '#757988',
      },
      // Status
      succ: {
        60: '#E5F9F4',
        70: '#98E1A2',
        80: '#00C39A',
        100: '#008C6F',
      },
      warn: {
        60: '#FFF7E8',
        80: '#FFB822',
        100: '#DE9906',
      },
      dang: {
        60: '#FDEDF0',
        80: '#F4516C',
        100: '#9E0038',
      },
    },
    fontFamily: {
      sans: ['Saans', 'sans-serif'],
      serif: ['Saans', 'serif'],
    },
    fontWeight: {
      normal: '380',
      medium: '500',
      semibold: '670',
      bold: '790',
    },
    fontSize: {
      '8xl': [
        '64px',
        {
          lineHeight: '1',
        },
      ],
      '7xl': [
        '56px',
        {
          lineHeight: '1',
        },
      ],
      '6xl': [
        '48px',
        {
          lineHeight: '1',
        },
      ],
      '5xl': [
        '36px',
        {
          lineHeight: '48px',
        },
      ],
      '4xl': [
        '32px',
        {
          lineHeight: '36px',
        },
      ],
      '3xl': [
        '26px',
        {
          lineHeight: '32px',
        },
      ],
      '2xl': [
        '22px',
        {
          lineHeight: '32px',
        },
      ],
      xl: [
        '20px',
        {
          lineHeight: '28px',
        },
      ],
      lg: [
        '16px',
        {
          lineHeight: '24px',
        },
      ],
      md: [
        '14px',
        {
          lineHeight: '22px',
        },
      ],
      sm: [
        '12px',
        {
          lineHeight: '18px',
        },
      ],
      xs: [
        '10px',
        {
          lineHeight: '16px',
        },
      ],
    },
    boxShadow: {
      lg: '/** ℹ️ hover for cards */ 0 10px 15px -3px rgb(0 0 0 / 0.03), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
      xl: '/** ℹ️ popover elements */ 0 20px 25px -5px rgb(0 0 0 / 0.03), 0 8px 10px -6px rgb(0 0 0 / 0.03)',
    },
    extend: {
      borderRadius: {
        none: '0',
        sm: '4px',
        DEFAULT: '6px',
        md: '10px',
        lg: '30px',
        full: '9999px',
      },
      screens: {
        '3xl': '1650px',
      },
      container: {
        center: true,
        padding: 32,
      },
      keyframes: {
        slideDownAndFade: {
          from: { opacity: 0, transform: 'translateY(-2px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideLeftAndFade: {
          from: { opacity: 0, transform: 'translateX(2px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        slideUpAndFade: {
          from: { opacity: 0, transform: 'translateY(2px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        slideRightAndFade: {
          from: { opacity: 0, transform: 'translateX(-2px)' },
          to: { opacity: 1, transform: 'translateX(0)' },
        },
        fadeDown: {
          '0%': { height: 0, opacity: 0 },
          '100%': { height: 'var(--radix-accordion-content-height)', opacity: 1 },
        },
        fadeUp: {
          '0%': {
            height: 'var(--radix-accordion-content-height)',
            opacity: 1,
          },
          '100%': {
            height: 0,
            opacity: 0,
          },
        },
        spinner: {
          '0%': {
            transform: 'rotate(0deg)',
          },
          '100%': {
            transform: 'rotate(360deg)',
          },
        },
        'sway-x': {
          '0%, 100%': {
            transform: 'translateX(-85%)',
          },
          '50%': {
            transform: 'translateX(85%)',
          },
        },
        'ai-gradient': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        shake: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(10deg)' },
          '75%': { transform: 'rotate(-10deg)' },
        },
      },
      animation: {
        slideDownAndFade: 'slideDownAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideLeftAndFade: 'slideLeftAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideUpAndFade: 'slideUpAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        slideRightAndFade: 'slideRightAndFade 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        spinner: 'spinner 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
        fadeIn: 'slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        fadeOut: 'slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1)',
        'sway-x': 'sway-x 1.2s cubic-bezier(0.59, 1, 0.86, 1) infinite',
        'ai-gradient': 'ai-gradient 2s ease infinite',
        shake: 'shake 0.4s ease-in-out',
      },
      backgroundImage: ({ theme }) => ({
        gradientMorningsun: `linear-gradient(90deg, ${theme('colors.gray.10')}, ${theme('colors.morningsun.100')})`,
        gradientLilac: `linear-gradient(90deg, ${theme('colors.gray.10')}, ${theme('colors.lilac.100')})`,
        dividerDashedH: `linear-gradient(90deg, ${theme('colors.sfgray.40')}, ${theme('colors.sfgray.40')} 75%, transparent 75%, transparent 100%)`,
        dividerDashedV: `linear-gradient(180deg, ${theme('colors.sfgray.40')}, ${theme('colors.sfgray.40')} 75%, transparent 75%, transparent 100%)`,
        agentButtonGradient: `linear-gradient(86deg, ${theme('colors.gray.10')} 1.26%, ${theme('colors.lilac.100')} 100%)`,
        'global-error': "url('@/assets/img/errors/global_error.svg')",
        'forest-auth': "url('@/assets/img/forest/forest_auth.jpg')",
        'software-mock': "url('@/assets/img/planted/softwareMock.webp')",
      }),
      backdropBlur: {
        sm: '2.5px',
      },
    },
    container: {
      screens: {
        sm: '100%',
        md: '100%',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
    plugin(function ({ addBase, theme }) {
      function extractColorVars(colorObj, colorGroup = '') {
        return Object.keys(colorObj).reduce((vars, colorKey) => {
          const value = colorObj[colorKey];
          const cssVariable =
            colorKey === 'DEFAULT' ? `--tw-color${colorGroup}` : `--tw-color${colorGroup}-${colorKey}`;

          const newVars =
            typeof value === 'string' ? { [cssVariable]: value } : extractColorVars(value, `-${colorKey}`);

          return { ...vars, ...newVars };
        }, {});
      }

      addBase({
        ':root': extractColorVars(theme('colors')),
        body: {
          color: 'var(--tw-color-an-100)',
        },
      });
    }),
    plugin(function ({ addVariant }) {
      addVariant('disabled', '&:is(:disabled, [aria-disabled="true"])');
      addVariant('invalid', '&:is(:invalid, [aria-invalid="true"])');
      addVariant('only-child', '&:only-child');
    }),
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.border-dashed-lg': {
          'border-style': 'dashed',
          'background-image': `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='24' ry='24' stroke='%23E8E9ED' stroke-width='4' stroke-dasharray='8 8' stroke-dashoffset='0' stroke-linecap='square'/%3e%3c/svg%3e")`,
          border: 'none',
        },
      });
    }),
  ],
};
