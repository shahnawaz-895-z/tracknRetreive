import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  Dimensions,
  ScrollView,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import API_CONFIG from '../config';
import { useNavigation } from '@react-navigation/native';

const SERVER_URL = API_CONFIG.API_URL; // Using centralized config

const { width, height } = Dimensions.get('window');

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState({});
  const [newImage, setNewImage] = useState(null);

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  // Move navigation options setup to its own useEffect
  useEffect(() => {
    const setNavigationOptions = () => {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
        ),
        headerTitle: 'Profile',
        headerStyle: {
          backgroundColor: '#3d0c45',
          elevation: 0,
          shadowOpacity: 0,
          height: 100,
        },
        headerTitleStyle: {
          fontSize: 24,
          fontWeight: '600',
          color: '#fff',
          marginTop: 8,
        },
        headerTitleAlign: 'center',
      });
    };

    setNavigationOptions();
  }, [navigation, isEditing, userData]);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to update your profile picture.');
      }
    }
  };

  const pickImage = async () => {
    if (!isEditing) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        console.log('Selected image URI:', uri);

        // Get file extension and create file name
        const fileExtension = uri.split('.').pop();
        const fileName = `profile.${fileExtension}`;

        setNewImage({
          uri: Platform.OS === 'ios' ? uri.replace('file://', '') : uri,
          type: `image/${fileExtension}`,
          name: fileName,
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const loadUserData = async () => {
    try {
      const userDataString = await AsyncStorage.getItem('userData');
      if (userDataString) {
        const parsedData = JSON.parse(userDataString);
        setUserData(parsedData);
        setEditedData(parsedData);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    try {
      if (!userData || !userData._id) {
        Alert.alert('Error', 'User data is missing');
        return;
      }

      const formData = new FormData();
      formData.append('name', editedData.name);
      formData.append('email', editedData.email);
      formData.append('mobile', editedData.phone);

      // Log FormData contents for debugging
      console.log('FormData contents before image:', [...formData]);

      if (newImage) {
        console.log('Appending image to FormData:', newImage);
        formData.append('profileImage', {
          uri: newImage.uri,
          type: newImage.type,
          name: newImage.name,
        });
      }

      // Log the complete FormData
      //console.log('Complete FormData:', [...formData]);

      // Log the request URL
      const requestUrl = `${SERVER_URL}/profile/${userData._id}`;
      console.log('Making request to:', requestUrl);

      const response = await fetch(requestUrl, {
        method: 'PUT',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      console.log('Response status:', response.status);

      const result = await response.json();
      console.log('Response data:', result);

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update profile');
      }

      // Update local storage with the new data
      const updatedUserData = {
        ...userData,
        name: editedData.name,
        email: editedData.email,
        phone: editedData.phone,
        ...(result.user || {}),
      };

      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      setUserData(updatedUserData);
      setIsEditing(false);
      setNewImage(null);

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert(
        'Error',
        `Failed to update profile: ${error.message}\nPlease check your network connection and try again.`
      );
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      navigation.replace('Login');
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3d0c45" />
      <ScrollView style={styles.scrollView}>
        {/* Profile Header with Image and Name */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            onPress={pickImage}
            disabled={!isEditing}
            style={[styles.imageContainer, isEditing && styles.imageContainerEditing]}
          >
            {(newImage?.uri || userData?.profileImage) ? (
              <Image
                source={{
                  uri: newImage
                    ? newImage.uri
                    : `data:${userData.profileImageType};base64,${userData.profileImage}`
                }}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Icon name="person" size={40} color="#666" />
              </View>
            )}
            {isEditing && (
              <View style={styles.editOverlay}>
                <Icon name="camera" size={24} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            {isEditing ? (
              <TextInput
                style={styles.nameInput}
                value={editedData.name}
                onChangeText={(text) => setEditedData({ ...editedData, name: text })}
                placeholder="Your name"
              />
            ) : (
              <Text style={styles.name}>{userData?.name || 'User Name'}</Text>
            )}
            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  setNewImage(null);
                  setEditedData(userData || {});
                }
                setIsEditing(!isEditing);
              }}
              style={styles.editButton}
            >
              <Icon
                name={isEditing ? "close" : "pencil"}
                size={20}
                color="#3b0b40"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Contact Information */}
        <View style={styles.infoContainer}>
          <View style={styles.infoItem}>
            <Icon name="mail-outline" size={24} color="#666" />
            <Text style={styles.infoText}>{userData?.email || 'email@example.com'}</Text>
          </View>

          <View style={styles.infoItem}>
            <Icon name="call-outline" size={24} color="#666" />
            {isEditing ? (
              <TextInput
                style={styles.mobileInput}
                value={editedData.phone}
                onChangeText={(text) => setEditedData({ ...editedData, phone: text })}
                placeholder="Your mobile number"
                keyboardType="phone-pad"
              />
            ) : (
              <Text style={styles.infoText}>{userData?.phone || 'Phone number'}</Text>
            )}
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ActivityListScreen')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="time-outline" size={24} color="#3b0b40" />
              <Text style={styles.menuItemText}>Activity History</Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('TipsScreen')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="book-outline" size={24} color="#3b0b40" />
              <Text style={styles.menuItemText}>Tips & Advice</Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('HelpScreen')}
          >
            <View style={styles.menuItemLeft}>
              <Icon name="information-circle-outline" size={24} color="#3b0b40" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Icon name="chevron-forward" size={24} color="#999" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24} color="#fff" style={styles.logoutIcon} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    padding: 10,
    marginRight: 10,
    marginTop: 8,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 25,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginTop: 10,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 45,
    overflow: 'hidden',
    marginRight: 20,
    borderWidth: 3,
    borderColor: '#3d0c45',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainerEditing: {
    opacity: 0.8,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3b0b40',
  },
  nameInput: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#3b0b40',
    flex: 1,
    marginRight: 10,
  },
  infoContainer: {
    padding: 25,
    backgroundColor: '#fff',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  mobileInput: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#3b0b40',
    paddingBottom: 4,
  },
  saveButton: {
    backgroundColor: '#3b0b40',
    margin: 25,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuContainer: {
    padding: 25,
    backgroundColor: '#fff',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    padding: 18,
    borderRadius: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#3b0b40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 25,
    padding: 18,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutIcon: {
    marginRight: 12,
  },
  logoutText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 8,
    marginTop: 8,
  },
});

export default ProfileScreen;