import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config';

const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    // Basic validation
    if (!email.trim()) {
        Alert.alert('Error', 'Please enter your email');
        return;
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
    }
    
    if (!password) {
        Alert.alert('Error', 'Please enter your password');
        return;
    }

    try {
        setIsLoading(true);
        const response = await fetch(API_CONFIG.LOGIN_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: email.trim(), password }),
        });

        // First check if response is ok
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({
                message: 'An error occurred during login'
            }));
            
            if (response.status === 401) {
                throw new Error('Invalid email or password');
            } else {
                throw new Error(errorData.message || 'Login failed');
            }
        }

        // Try to parse the response as JSON
        const data = await response.json();

        if (data.user && data.token) {
            // Store both user data and token
            await AsyncStorage.setItem('userData', JSON.stringify(data.user));
            await AsyncStorage.setItem('authToken', data.token);
            
            navigation.reset({
                index: 0,
                routes: [{ name: 'HomePage' }],
            });
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        Alert.alert('Error', error.message || 'Failed to login');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <View style={styles.inputContainer}>
        <Icon name="mail-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      <View style={styles.inputContainer}>
        <Icon name="lock-closed-outline" size={20} color="#4F46E5" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
        <Text style={styles.forgotPassword}>Forgot password?</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.signInButton, isLoading && styles.disabledButton]} 
        onPress={handleLogin}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.signInButtonText}>SIGN IN</Text>
        )}
      </TouchableOpacity>
      <View style={styles.signupContainer}>
        <Text style={styles.signupText}>Don't Have An Account?</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.signupLink}>Sign Up</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: width * 0.05,
    backgroundColor: '#f6f7fb',
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: 'bold',
    marginBottom: height * 0.04,
    textAlign: 'center',
    color: '#232946',
    letterSpacing: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e7ef',
    borderRadius: width * 0.08,
    marginBottom: height * 0.02,
    paddingHorizontal: width * 0.025,
    backgroundColor: '#fff',
    shadowColor: '#232946',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 10,
    paddingLeft: 5,
    color: '#4F46E5',
  },
  input: {
    flex: 1,
    padding: width * 0.025,
    fontSize: width * 0.04,
    color: '#232946',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    color: '#4F46E5',
    textAlign: 'right',
    marginBottom: height * 0.025,
    fontSize: width * 0.035,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: '#4F46E5',
    padding: height * 0.02,
    borderRadius: width * 0.08,
    alignItems: 'center',
    marginBottom: height * 0.025,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    backgroundColor: '#a5b4fc',
    opacity: 0.7,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  signupText: {
    color: '#232946',
    fontWeight: '500',
  },
  signupLink: {
    color: '#4F46E5',
    marginLeft: 5,
    fontWeight: 'bold',
  },
});

export default LoginScreen;
