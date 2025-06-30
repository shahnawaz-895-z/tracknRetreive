import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform, Image, ScrollView, ActivityIndicator, Dimensions, Modal, SafeAreaView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config';
import * as ImageManipulator from 'expo-image-manipulator';

const { width, height } = Dimensions.get('window');
const ACTIVITY_STORAGE_KEY = 'user_activities';

const ReportFoundPerson = () => {
  const navigation = useNavigation();
  const [time, setTime] = useState(new Date());
  const [date, setDate] = useState(new Date());
  const [location, setLocation] = useState('');
  const [photo, setPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [isFaceProcessing, setIsFaceProcessing] = useState(false);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [description, setDescription] = useState('');
  const [contact, setContact] = useState('');
  const [geolocation, setGeolocation] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [fullScreenMap, setFullScreenMap] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [faceVerificationResult, setFaceVerificationResult] = useState(null);
  const [matchedLostPersons, setMatchedLostPersons] = useState([]);

  useEffect(() => {
    const getLocationPermission = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for better matching.');
        return;
      }

      try {
        const userLocation = await Location.getCurrentPositionAsync({});
        setGeolocation(userLocation.coords);
        setSelectedLocation(userLocation.coords);
        const address = await Location.reverseGeocodeAsync(userLocation.coords);
        if (address && address.length > 0) {
          setLocation(`${address[0]?.city || ''}, ${address[0]?.region || ''}, ${address[0]?.country || ''}`);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getLocationPermission();
  }, []);

  useEffect(() => {
    const getPermissions = async () => {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        console.log('Camera permission not granted');
      }

      const mediaLibraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (mediaLibraryPermission.status !== 'granted') {
        console.log('Media library permission not granted');
      }
    };

    getPermissions();
  }, []);

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera permission is required to take photos.');
      return;
    }

    try {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setPhoto(selectedImageUri);
        handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const launchImageLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Media library permission is required to select photos.');
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        setPhoto(selectedImageUri);
        handleImageUpload(result.assets[0]);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleImageUpload = async (asset) => {
    if (!asset || !asset.uri) {
      console.error('No image asset provided');
      return;
    }

    setIsImageProcessing(true);
    try {
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      let imageUri = asset.uri;
      if (fileInfo.size > 5 * 1024 * 1024) {
        try {
          const result = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );
          imageUri = result.uri;
          console.log('Image compressed successfully');
        } catch (compressionError) {
          console.error('Error compressing image:', compressionError);
        }
      }

      // Perform face detection
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      const faceResponse = await fetch('https://api.deepface.com/v1/face/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.DEEPFACE_API_KEY}`,
        },
        body: JSON.stringify({
          img: base64Image,
          detector_backend: 'opencv',
          enforce_detection: true,
          align: true,
        }),
      });

      if (faceResponse.ok) {
        const faceData = await faceResponse.json();
        if (faceData && faceData.length > 0) {
          setAge(faceData[0].age.toString());
          setGender(faceData[0].gender);
          
          // Search for matching lost persons
          await searchMatchingLostPersons(base64Image);
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setIsImageProcessing(false);
    }
  };

  const searchMatchingLostPersons = async (base64Image) => {
    try {
      setIsFaceProcessing(true);
      const response = await fetch(`${API_CONFIG.API_URL}/lostitem/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Image,
          category: 'Lost Person',
        }),
      });

      if (response.ok) {
        const matches = await response.json();
        setMatchedLostPersons(matches);
      }
    } catch (error) {
      console.error('Error searching for matches:', error);
    } finally {
      setIsFaceProcessing(false);
    }
  };

  const handleMapPress = (event) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedLocation({ latitude, longitude });

    Location.reverseGeocodeAsync({ latitude, longitude }).then((addresses) => {
      if (addresses && addresses.length > 0) {
        const formattedAddress = `${addresses[0]?.name ? addresses[0].name + ', ' : ''}${addresses[0]?.street ? addresses[0].street + ', ' : ''}${addresses[0]?.city ? addresses[0].city + ', ' : ''}${addresses[0]?.region ? addresses[0].region + ', ' : ''}${addresses[0]?.country || ''}`;
        setLocation(formattedAddress.replace(/,\s*$/, ''));
      }
    });
  };

  const openFullScreenMap = () => {
    setFullScreenMap(true);
  };

  const confirmLocation = () => {
    setFullScreenMap(false);
  };

  const detectCurrentLocation = async () => {
    try {
      setIsLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for better matching.');
        setIsLocationLoading(false);
        return;
      }

      const userLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      setGeolocation(userLocation.coords);
      setSelectedLocation(userLocation.coords);
      
      const address = await Location.reverseGeocodeAsync(userLocation.coords);
      if (address && address.length > 0) {
        const formattedAddress = `${address[0]?.name ? address[0].name + ', ' : ''}${address[0]?.street ? address[0].street + ', ' : ''}${address[0]?.city ? address[0].city + ', ' : ''}${address[0]?.region ? address[0].region + ', ' : ''}${address[0]?.country || ''}`;
        setLocation(formattedAddress.replace(/,\s*$/, ''));
      }
      
      setFullScreenMap(true);
      setIsLocationLoading(false);
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to detect current location. Please try again.');
      setIsLocationLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert('Error', 'A photo is required for Found Person reports.');
      return;
    }

    if (!location) {
      Alert.alert('Error', 'Please provide the location where the person was found.');
      return;
    }

    if (!contact) {
      Alert.alert('Error', 'Please provide contact information.');
      return;
    }

    setIsLoading(true);

    try {
      const authToken = await AsyncStorage.getItem('authToken');
      if (!authToken) {
        Alert.alert('Error', 'Please log in to submit a report.');
        navigation.navigate('Login');
        return;
      }

      const formData = new FormData();
      formData.append('category', 'Found Person');
      formData.append('location', location);
      formData.append('description', description);
      formData.append('time', time.toISOString());
      formData.append('date', date.toISOString());
      formData.append('contact', contact);
      formData.append('age', age);
      formData.append('gender', gender);

      if (selectedLocation) {
        formData.append('latitude', selectedLocation.latitude);
        formData.append('longitude', selectedLocation.longitude);
      }

      if (photo) {
        const fileInfo = await FileSystem.getInfoAsync(photo);
        let photoToUpload = photo;
        
        if (fileInfo.size > 2 * 1024 * 1024) {
          try {
            const result = await ImageManipulator.manipulateAsync(
              photo,
              [{ resize: { width: 1200 } }],
              { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            photoToUpload = result.uri;
          } catch (compressionError) {
            console.error('Error compressing photo:', compressionError);
          }
        }
        
        let photoUri = photoToUpload;
        if (Platform.OS === 'android' && !photoToUpload.startsWith('file://')) {
          photoUri = `file://${photoToUpload}`;
        }
        
        formData.append('photo', {
          uri: photoUri,
          type: 'image/jpeg',
          name: 'photo.jpg',
        });
      }

      const response = await axios.post(`${API_CONFIG.API_URL}/founditem`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${authToken}`
        },
        timeout: 30000,
      });

      if (response.data.status === 'success') {
        Alert.alert(
          'Success!',
          'The found person has been reported successfully. We will notify you if we find any matches!',
          [
            {
              text: 'OK',
              onPress: () => {
                setPhoto(null);
                setDescription('');
                setTime(new Date());
                setDate(new Date());
                setLocation('');
                setContact('');
                setAge('');
                setGender('');
                setFaceVerificationResult(null);
                setMatchedLostPersons([]);
                navigation.navigate('HomePage');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to submit found person report. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting found person:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Found Person</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Upload Photo:</Text>
          <View style={styles.photoButtonsContainer}>
            <TouchableOpacity onPress={launchCamera} style={[styles.cameraButton, {flex: 1}]}>
              <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={launchImageLibrary} style={[styles.galleryButton, {flex: 1}]}>
              <Ionicons name="images-outline" size={24} color="#FFFFFF" />
              <Text style={styles.buttonText}>Select from Gallery</Text>
            </TouchableOpacity>
          </View>
          {photo && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: photo }} style={styles.image} />
              <TouchableOpacity 
                style={styles.removePhotoButton}
                onPress={() => {
                  setPhoto(null);
                  setDescription('');
                  setAge('');
                  setGender('');
                  setMatchedLostPersons([]);
                }}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {isImageProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3d0c45" />
            <Text style={styles.loadingText}>Processing image...</Text>
          </View>
        )}

        {isFaceProcessing && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3d0c45" />
            <Text style={styles.loadingText}>Searching for matches...</Text>
          </View>
        )}

        {matchedLostPersons.length > 0 && (
          <View style={styles.matchesContainer}>
            <Text style={styles.matchesTitle}>Potential Matches Found</Text>
            {matchedLostPersons.map((match, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.matchItem}
                onPress={() => navigation.navigate('LostPersonDetails', { person: match })}
              >
                <Image source={{ uri: match.photo }} style={styles.matchImage} />
                <View style={styles.matchDetails}>
                  <Text style={styles.matchName}>Reported on {new Date(match.date).toLocaleDateString()}</Text>
                  <Text style={styles.matchLocation}>{match.location}</Text>
                  <Text style={styles.matchDescription}>{match.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Age:</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={age}
              onChangeText={setAge}
              placeholder="Estimated age"
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gender:</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={gender}
              onChangeText={setGender}
              placeholder="Gender"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Location Found:</Text>
          <View style={styles.locationContainer}>
            <TouchableOpacity 
              style={[styles.inputContainer, { flex: 1 }]} 
              onPress={openFullScreenMap}
            >
              <Ionicons name="location-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
              <Text style={styles.inputText}>
                {location || 'Tap to select location on map'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.detectLocationButton}
              onPress={detectCurrentLocation}
              disabled={isLoading}
            >
              <Ionicons name="locate" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Date Found:</Text>
          <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <Text style={styles.inputText}>{date.toDateString()}</Text>
          </TouchableOpacity>
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setDate(selectedDate);
              }
            }}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Time Found:</Text>
          <TouchableOpacity style={styles.inputContainer} onPress={() => setShowTimePicker(true)}>
            <Ionicons name="time-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <Text style={styles.inputText}>
              {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>
        {showTimePicker && (
          <DateTimePicker
            value={time}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(Platform.OS === 'ios');
              if (selectedTime) {
                setTime(selectedTime);
              }
            }}
          />
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contact Information:</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
              value={contact}
              onChangeText={setContact}
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Additional Details:</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="document-text-outline" size={24} color="#3d0c45" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { height: 100 }]}
              placeholder="Describe any additional details about the person's condition, clothing, or other identifying characteristics"
              value={description}
              onChangeText={setDescription}
              multiline
              placeholderTextColor="#666"
            />
          </View>
        </View>

        <Modal
          visible={fullScreenMap}
          animationType="slide"
          onRequestClose={() => setFullScreenMap(false)}
        >
          <SafeAreaView style={styles.fullMapContainer}>
            <View style={styles.mapHeader}>
              <TouchableOpacity 
                style={styles.mapBackButton}
                onPress={() => setFullScreenMap(false)}
              >
                <Ionicons name="arrow-back" size={24} color="#3d0c45" />
                <Text style={styles.mapHeaderText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.mapLocateButton}
                onPress={detectCurrentLocation}
              >
                <Ionicons name="locate" size={24} color="#3d0c45" />
              </TouchableOpacity>
            </View>
            
            <MapView
              style={styles.fullMap}
              region={{
                latitude: selectedLocation?.latitude || geolocation?.latitude || 37.78825,
                longitude: selectedLocation?.longitude || geolocation?.longitude || -122.4324,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
            >
              {selectedLocation && (
                <Marker coordinate={selectedLocation} title="Selected Location" />
              )}
            </MapView>
            
            <View style={styles.mapFooter}>
              <Text style={styles.selectedLocationText} numberOfLines={2}>
                {location || 'No location selected'}
              </Text>
              <TouchableOpacity 
                style={styles.confirmLocationButton}
                onPress={confirmLocation}
              >
                <Text style={styles.confirmLocationText}>Use This Location</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Modal>
      </View>

      <TouchableOpacity 
        style={styles.submitButton} 
        onPress={handleSubmit}
        disabled={isLoading || isLocationLoading || isImageProcessing}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>SUBMIT REPORT</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: width * 0.05,
    backgroundColor: '#3d0c45',
  },
  backButton: {
    padding: width * 0.02,
  },
  headerTitle: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    color: '#fff',
  },
  formContainer: {
    padding: width * 0.05,
  },
  inputGroup: {
    marginBottom: height * 0.025,
  },
  label: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#3d0c45',
    marginBottom: height * 0.01,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: width * 0.03,
    borderWidth: 1,
    borderColor: 'rgba(61, 12, 69, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    padding: width * 0.03,
  },
  input: {
    flex: 1,
    padding: width * 0.03,
    color: '#333',
    fontSize: width * 0.04,
  },
  inputText: {
    flex: 1,
    padding: width * 0.03,
    color: '#333',
    fontSize: width * 0.04,
  },
  photoButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: height * 0.02,
    gap: width * 0.03,
  },
  cameraButton: {
    backgroundColor: '#3d0c45',
    padding: height * 0.015,
    borderRadius: width * 0.03,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  galleryButton: {
    backgroundColor: '#5a1c64',
    padding: height * 0.015,
    borderRadius: width * 0.03,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: width * 0.035,
    fontWeight: 'bold',
    marginLeft: width * 0.02,
  },
  imagePreviewContainer: {
    position: 'relative',
    width: '100%',
    height: width * 0.7,
    marginVertical: height * 0.02,
    borderRadius: width * 0.03,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 20,
    padding: 5,
    zIndex: 10,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detectLocationButton: {
    backgroundColor: '#3d0c45',
    borderRadius: 8,
    padding: 12,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    color: '#3d0c45',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fullMapContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    zIndex: 10,
  },
  mapBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
  },
  mapHeaderText: {
    fontSize: 16,
    marginLeft: 5,
    color: '#3d0c45',
    fontWeight: 'bold',
  },
  mapLocateButton: {
    padding: 10,
  },
  fullMap: {
    flex: 1,
    width: '100%',
  },
  mapFooter: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  selectedLocationText: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
  },
  confirmLocationButton: {
    backgroundColor: '#3d0c45',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#3d0c45',
    margin: width * 0.05,
    padding: height * 0.02,
    borderRadius: width * 0.03,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
  },
  matchesContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3d0c45',
    marginBottom: 15,
  },
  matchItem: {
    flexDirection: 'row',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  matchImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  matchDetails: {
    flex: 1,
  },
  matchName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  matchLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  matchDescription: {
    fontSize: 14,
    color: '#666',
  },
});

export default ReportFoundPerson; 