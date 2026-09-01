import MapView, { Marker } from 'react-native-maps';
import { StyleSheet, Text, View } from 'react-native';

export default function MapPreview({ region, locationName }) {
  return (
    <View style={styles.wrapper}>
      <MapView style={styles.map} region={region} showsUserLocation showsCompass>
        <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} title={locationName || 'Report location'} />
      </MapView>
      {locationName ? <Text style={styles.locationName}>{locationName}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { height: 170, borderRadius: 6, marginBottom: 4, overflow: 'hidden' },
  map: { ...StyleSheet.absoluteFillObject },
  locationName: { position: 'absolute', left: 8, right: 8, bottom: 8, backgroundColor: 'rgba(255,255,255,0.92)', padding: 6, color: '#073b82', fontSize: 11, fontWeight: '800' },
});