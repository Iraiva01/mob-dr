// =============================================================================
// Icon Grid Selector Component
// =============================================================================
// Reusable visual option picker adhering to `icon-grid-selector` skill &
// `new-screen-design` (Uber-inspired minimal black & white aesthetic).
//
// Key features:
//   - Single selection
//   - Supports grid layout or horizontal scrollable row
//   - Supports square cards or circular cards
//   - Automatically handles "Other" option: reveals an underline-style text input
//     when selected, and clears/hides it if another option is chosen.
//   - Accepts vector icon names, React components, or pre-rendered elements.
// =============================================================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ImageSourcePropType,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type IconRenderable =
  | string // Name of an Ionicons icon, e.g. "phone-portrait-outline"
  | React.ComponentType<{ color: string; size: number }> // Component type e.g. CustomIcon
  | React.ReactElement // Pre-rendered element e.g. <Ionicons ... />
  | ImageSourcePropType; // Static image or { uri: string }

export interface IconGridOption {
  value: string;
  label: string;
  icon?: IconRenderable;
  isOther?: boolean;
}

export interface IconGridSelectorProps {
  /** Array of selectable options (last option should be 'Other') */
  options: IconGridOption[];

  /** Currently selected option value */
  selectedValue: string | null;

  /** Callback when an option is selected */
  onSelect: (value: string) => void;

  /** Free-typed text value when "Other" is selected */
  otherValue?: string;

  /** Callback when the "Other" text changes */
  onOtherChange?: (text: string) => void;

  /** Placeholder for the "Other" text input */
  otherPlaceholder?: string;

  /** Label shown above the "Other" text input */
  otherLabel?: string;

  /** Layout style: 'grid' (default) or 'row' (horizontal scrollable row) */
  layout?: 'grid' | 'row';

  /** Shape of the card: 'square' (default) or 'circle' */
  cardShape?: 'square' | 'circle';

  /** Visual highlight when selected: 'fill' (black background) or 'border' (thick black border) */
  selectedStyle?: 'fill' | 'border';

  /** Number of columns when using 'grid' layout (default: 3) */
  columns?: number;
}

export default function IconGridSelector({
  options,
  selectedValue,
  onSelect,
  otherValue = '',
  onOtherChange,
  otherPlaceholder = 'Tell us more',
  otherLabel = 'Please specify',
  layout = 'grid',
  cardShape = 'square',
  selectedStyle = 'fill',
  columns = 3,
}: IconGridSelectorProps) {
  // Fade / slide animation for the "Other" text input
  const animOpacity = useRef(new Animated.Value(0)).current;
  const animTranslateY = useRef(new Animated.Value(-8)).current;

  // Determine if the currently selected option is "Other"
  const isOtherSelected =
    selectedValue === 'other' ||
    options.find((opt) => opt.value === selectedValue)?.isOther === true;

  useEffect(() => {
    if (isOtherSelected) {
      Animated.parallel([
        Animated.timing(animOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(animTranslateY, {
          toValue: -8,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isOtherSelected, animOpacity, animTranslateY]);

  /**
   * Handle card selection.
   * If selecting a non-other option, clear the other text value per SKILL.md.
   */
  const handleSelectOption = (item: IconGridOption) => {
    const willBeOther = item.value === 'other' || item.isOther === true;
    if (!willBeOther && isOtherSelected && onOtherChange) {
      onOtherChange('');
    }
    onSelect(item.value);
  };

  /**
   * Render icon flexibly (string name, component, element, or image).
   */
  const renderIcon = (icon: IconRenderable | undefined, isSelected: boolean) => {
    const iconColor =
      isSelected && selectedStyle === 'fill' ? '#FFFFFF' : '#000000';
    const iconSize = cardShape === 'circle' ? 26 : 28;

    if (!icon) {
      // Default fallback icon if none specified
      return <Ionicons name="apps-outline" size={iconSize} color={iconColor} />;
    }

    if (typeof icon === 'string') {
      // Ionicons name string
      return <Ionicons name={icon as any} size={iconSize} color={iconColor} />;
    }

    if (React.isValidElement(icon)) {
      // Pre-rendered JSX element
      return icon;
    }

    if (typeof icon === 'function') {
      // React component constructor
      const IconComponent = icon as React.ComponentType<{ color: string; size: number }>;
      return <IconComponent color={iconColor} size={iconSize} />;
    }

    if (typeof icon === 'number' || (typeof icon === 'object' && 'uri' in icon)) {
      // Image source
      return (
        <Image
          source={icon as ImageSourcePropType}
          style={{ width: iconSize, height: iconSize, tintColor: iconColor }}
          resizeMode="contain"
        />
      );
    }

    return null;
  };

  /**
   * Render a single option card.
   */
  const renderOptionCard = (item: IconGridOption) => {
    const isSelected = selectedValue === item.value;
    const isCircle = cardShape === 'circle';

    // Dynamic style computation based on selection and variant
    const cardBgColor =
      isSelected && selectedStyle === 'fill' ? '#000000' : '#FFFFFF';
    const cardBorderColor = isSelected ? '#000000' : '#EAEAEA';
    const cardBorderWidth = isSelected && selectedStyle === 'border' ? 2 : 1;
    const textColor =
      isSelected && selectedStyle === 'fill' && !isCircle ? '#FFFFFF' : '#000000';

    if (isCircle) {
      // Circular Card: Circle container with label placed below the circle
      return (
        <TouchableOpacity
          key={item.value}
          style={styles.circleItemWrapper}
          onPress={() => handleSelectOption(item)}
          activeOpacity={0.7}
          accessibilityRole="radio"
          accessibilityState={{ selected: isSelected }}
          accessibilityLabel={item.label}
        >
          <View
            style={[
              styles.circleCard,
              {
                backgroundColor: cardBgColor,
                borderColor: cardBorderColor,
                borderWidth: cardBorderWidth,
              },
            ]}
          >
            {renderIcon(item.icon, isSelected)}
          </View>
          <Text
            style={[
              styles.circleLabel,
              isSelected && styles.circleLabelSelected,
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        </TouchableOpacity>
      );
    }

    // Square Card: Rounded square with icon at center and label inside
    const itemWidthPercent = `${Math.floor(100 / columns) - 2.5}%` as any;

    return (
      <TouchableOpacity
        key={item.value}
        style={[
          styles.squareCard,
          layout === 'grid' && { width: itemWidthPercent },
          {
            backgroundColor: cardBgColor,
            borderColor: cardBorderColor,
            borderWidth: cardBorderWidth,
          },
        ]}
        onPress={() => handleSelectOption(item)}
        activeOpacity={0.7}
        accessibilityRole="radio"
        accessibilityState={{ selected: isSelected }}
        accessibilityLabel={item.label}
      >
        <View style={styles.squareIconContainer}>
          {renderIcon(item.icon, isSelected)}
        </View>
        <Text
          style={[
            styles.squareLabel,
            { color: textColor },
            isSelected && styles.boldLabel,
          ]}
          numberOfLines={2}
        >
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Options Container: Horizontal Row or Flex Grid */}
      {layout === 'row' ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rowContentContainer}
        >
          {options.map(renderOptionCard)}
        </ScrollView>
      ) : (
        <View style={styles.gridContainer}>
          {options.map(renderOptionCard)}
        </View>
      )}

      {/* "Other" Text Input (revealed dynamically below selector) */}
      {isOtherSelected ? (
        <Animated.View
          style={[
            styles.otherInputContainer,
            {
              opacity: animOpacity,
              transform: [{ translateY: animTranslateY }],
            },
          ]}
        >
          <Text style={styles.otherInputLabel}>{otherLabel}</Text>
          <TextInput
            style={styles.otherInput}
            placeholder={otherPlaceholder}
            placeholderTextColor="#BBBBBB"
            value={otherValue}
            onChangeText={onOtherChange}
            autoCapitalize="words"
            autoFocus
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

// =============================================================================
// Styles — Uber-inspired minimal: white (#FFFFFF), black (#000000), gray (#8A8A8A)
// =============================================================================
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },

  // Grid layout container
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },

  // Row layout container (horizontal scroll)
  rowContentContainer: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    gap: 14,
    flexDirection: 'row',
  },

  // Square Card
  squareCard: {
    minHeight: 96,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    // Subtle shadow per new-screen-design
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  squareIconContainer: {
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  squareLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  boldLabel: {
    fontWeight: '700',
  },

  // Circle Card
  circleItemWrapper: {
    alignItems: 'center',
    marginRight: 6,
    width: 68,
  },
  circleCard: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 2,
  },
  circleLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000000',
    textAlign: 'center',
  },
  circleLabelSelected: {
    fontWeight: '700',
  },

  // "Other" Dynamic Text Input (Uber underline style)
  otherInputContainer: {
    marginTop: 20,
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  otherInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  otherInput: {
    fontSize: 16,
    color: '#000000',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: '#000000',
  },
});
