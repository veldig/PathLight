import { View, Text, StyleSheet } from 'react-native';

export default function FocusPathScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>hello</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 32,
    fontWeight: '600',
  },
});
