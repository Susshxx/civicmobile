import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

export default function MapPreview({ region, locationName }) {
  // Map preview hidden - component returns null
  return null;
}

const styles = StyleSheet.create({
  map: {
    height: 170,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: '#dce8df',
    borderWidth: 1,
    borderColor: '#c1d2c5',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
    backgroundColor: '#dce8df',
    borderWidth: 12,
    borderColor: '#c7d9c9',
  },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ea123b',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  pinText: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  mapLabel: { marginTop: 8, color: '#073b82', fontSize: 12, fontWeight: '800' },
  mapLink: { marginTop: 3, color: '#2378bd', fontSize: 11, fontWeight: '700' },
});
