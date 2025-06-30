// ForgotPasswordScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isValidEmail, setIsValidEmail] = useState(false);

  const validateEmail = (text) => {
    setEmail(text);
    const emailRegex = /\S+@\S+\.\S+/;
    setIsValidEmail(emailRegex.test(text));
  };

  const handleSend = () => {
    // Forgot password logic (e.g., send email to reset password)
    console.log('Reset password for:', email);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Icon name="arrow-back-outline" size={24} color={styles.backIcon.color} style={styles.backIcon} />
      </TouchableOpacity>

      <Text style={styles.title}>Forgot password</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={validateEmail}
        keyboardType="email-address"
      />
      {isValidEmail ? (
        <Icon name="checkmark-circle-outline" size={20} color="green" style={styles.icon} />
      ) : (
        email && <Icon name="close-circle-outline" size={20} color="red" style={styles.icon} />
      )}

      <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
        <Text style={styles.sendButtonText}>SEND</Text>
      </TouchableOpacity>
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
  backIcon: {
    position: 'absolute',
    top: height * 0.05,
    left: width * 0.05,
    color: '#4F46E5',
  },
  title: {
    fontSize: width * 0.07,
    fontWeight: 'bold',
    marginBottom: height * 0.04,
    textAlign: 'center',
    color: '#232946',
    letterSpacing: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e7ef',
    padding: height * 0.015,
    marginBottom: height * 0.025,
    borderRadius: width * 0.08,
    paddingLeft: width * 0.1,
    fontSize: width * 0.04,
    backgroundColor: '#fff',
    color: '#232946',
    shadowColor: '#232946',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  icon: {
    position: 'absolute',
    right: width * 0.1,
    top: height * 0.17,
  },
  sendButton: {
    backgroundColor: '#4F46E5',
    padding: height * 0.02,
    borderRadius: width * 0.08,
    alignItems: 'center',
    marginTop: height * 0.025,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: width * 0.045,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default ForgotPasswordScreen;
