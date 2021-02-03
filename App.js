import React, { useState, useEffect, useRef } from 'react';
import MapView, { PROVIDER_GOOGLE, AnimatedRegion, Animated } from 'react-native-maps';
import { StyleSheet, View, Dimensions, Image  } from 'react-native';
import Scooter from './assets/scooter.png';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
const aspect_ratio = width / height;
const min_lat_zoom = 0.001;
const max_lat_zoom = 0.020;
const lng_zoom = aspect_ratio * min_lat_zoom;

export default function App() {
  //marker and map ref 
  const refMarker = useRef(null);
  const refMap = useRef(null);

  //speed
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [prevSpeed, setPrevSpeed] = useState(0);

  //map coordinate
  const [centerMap, setCenterMap] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: min_lat_zoom,
    longitudeDelta: lng_zoom,
  })

  //currentcenter when trigger watch location
  const [newCenterMap, setNewCenterMap] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: min_lat_zoom,
    longitudeDelta: lng_zoom,
  })

  //marker coordinate
  const [markerCoord, setMarkerCoord] = useState( new AnimatedRegion({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0,
    longitudeDelta: 0,
  }))

  //direction of the marker
  const [angle, setAngle] = useState(90)

  useEffect(() => {
    (async () => {
      //we need user permission to get location
      let { status } = await Location.requestPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});

      let newCenter = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: centerMap.latitudeDelta,
        longitudeDelta: centerMap.longitudeDelta
      }

      //update map to user location
      refMap.current.animateToRegion(newCenter, 1000);

      setCenterMap(newCenter)

      //update marker
      setMarkerCoord({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      })

      var watchID = await Location.watchPositionAsync(
        {
          accuracy: 6,
          distanceInterval: 1,
          timeInterval: 1 
        }, 
        getLocation
      );

      return () => watchID.remove();
    })();
  }, [])

  useEffect(() => {
    var diff = 0;
    var type = '';

    // console.log('PrevSpeed: ', prevSpeed);
    // console.log('currentSpeed: ', currentSpeed)
    //just take the differnect of old speed and new speed
    if(currentSpeed > prevSpeed){
      type = 'increase';
      diff = currentSpeed - prevSpeed;
    } else if(currentSpeed < prevSpeed) {
      type = 'decrease';
      diff = prevSpeed - currentSpeed;
    }
    
    //we change only if speed change with 5km/h to prevent up/down map
    if(diff > 5){
      updateZoom(diff, type);
    }

    setPrevSpeed(currentSpeed);
  },[currentSpeed])

  useEffect(() => {
    var keepZoomUpdated = {
      ...newCenterMap, latitudeDelta: centerMap.latitudeDelta
    }

    if(refMap && refMap.current){
      refMap.current.animateToRegion(keepZoomUpdated,1000);
    }
    setCenterMap(keepZoomUpdated);
  },[newCenterMap])

  const getLocation = (location) => {
    //update angle of marker
    setAngle(location.coords.heading);
    //update speed
    setCurrentSpeed(location.coords.speed);

    let newCenter = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      longitudeDelta: centerMap.longitudeDelta
    }

    setNewCenterMap(newCenter);

    // if(refMarker && refMarker.current){
      // refMarker.current.animateMarkerToCoordinate({ latitude: location.coords.latitude, longitude: location.coords.longitude },3000)
    // }

    //update marker
    setMarkerCoord({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude
    })
  }

  //update zoom of the map depend on speed
  const updateZoom = async (diff, type) => {
    var zoomToChange = 0;

    var newCenter = centerMap;

    //decrease zoom
    if(type === 'decrease'){
      zoomToChange = parseFloat(((max_lat_zoom * diff) / 130)).toFixed(5)

      newCenter = {...newCenter, latitudeDelta: centerMap.latitudeDelta - parseFloat(zoomToChange) < min_lat_zoom ? min_lat_zoom : centerMap.latitudeDelta - parseFloat(zoomToChange) };
    } else { //increase zoom
      zoomToChange = parseFloat((max_lat_zoom * diff) / 130).toFixed(5)
      
      newCenter = {...newCenter, latitudeDelta: centerMap.latitudeDelta + parseFloat(zoomToChange) > max_lat_zoom ? centerMap.latitudeDelta : centerMap.latitudeDelta + parseFloat(zoomToChange) };
    }
    
    await setCenterMap(newCenter);
    refMap.current.animateToRegion(newCenter,300);
  }

  return (
      <View style={styles.container}>
        <Animated 
          style={styles.map}
          provider={ PROVIDER_GOOGLE }
          initialRegion = { centerMap }
          loadingEnabled={ true }
          ref={ refMap } 
        >
          <MapView.Marker.Animated
            ref={ refMarker }
            coordinate={ markerCoord }
            flat={ true }
            style={{transform:  [
              { rotateZ: `${ angle + 10}deg` },
              { rotateX: `${ angle + 10}deg` },
              { rotateY: `${ angle + 10}deg` }
            ]}}
          >
            <Image
              source={ Scooter }
              style={{width: 58, height: 58}}
            />
          </MapView.Marker.Animated>

          {/* {
            destCoord.length ? 
              <Polyline
                coordinates={destCoord}
                strokeColor="#000" 
                strokeColors={[
                  '#7F0000',
                  '#00000000',
                  '#B24112',
                  '#E5845C',
                  '#238C23',
                  '#7F0000'
                ]}
                strokeWidth={6}
              />
            : null
          } */}
        </Animated>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  map: {
    flex:1,
    position:'relative',
    width:'100%',
    height:'100%',
  }
});