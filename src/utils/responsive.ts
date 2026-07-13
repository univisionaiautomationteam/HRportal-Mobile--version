import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Default guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

const isTablet = width >= 768;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const verticalScale = (size: number) => (height / guidelineBaseHeight) * size;
export const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

export const getIsTablet = () => isTablet;
