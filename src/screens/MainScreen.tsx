import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Button, 
  StyleSheet, 
  Modal 
} from 'react-native';
import { Location, ChecklistItem } from '../types';
import { storeData, getData } from '../utils/storage';
import uuid from 'react-native-uuid';
import Icon from 'react-native-vector-icons/Ionicons';

const MainScreen: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  // 앱 시작 시 저장된 데이터 불러오기
  useEffect(() => {
    loadSavedData();
  }, []);

  // 데이터 저장 함수들
  const loadSavedData = async () => {
    const savedLocations = await getData('locations');
    const savedItems = await getData('checklistItems');
    
    if (savedLocations) setLocations(savedLocations);
    if (savedItems) setChecklistItems(savedItems);
  };

  const saveLocations = async (updatedLocations: Location[]) => {
    setLocations(updatedLocations);
    await storeData('locations', updatedLocations);
  };

  const saveChecklistItems = async (updatedItems: ChecklistItem[]) => {
    setChecklistItems(updatedItems);
    await storeData('checklistItems', updatedItems);
  };

  // 장소 추가 함수
  const addLocation = () => {
    if (!newLocationName.trim()) return;

    const newLocation: Location = {
      id: uuid.v4().toString(),
      name: newLocationName.trim()
    };

    const updatedLocations = [...locations, newLocation];
    saveLocations(updatedLocations);
    setNewLocationName('');
    setModalVisible(false); // 모달 닫기
  };

  // 체크리스트 아이템 추가 함수
  const addChecklistItem = () => {
    if (!newItemName.trim() || !selectedLocation) return;

    const newItem: ChecklistItem = {
      id: uuid.v4().toString(),
      name: newItemName.trim(),
      isChecked: false,
      locationId: selectedLocation.id
    };

    const updatedItems = [...checklistItems, newItem];
    saveChecklistItems(updatedItems);
    setNewItemName('');
  };

  // 체크리스트 아이템 토글 함수
  const toggleChecklistItem = (itemId: string) => {
    const updatedItems = checklistItems.map(item => 
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );
    saveChecklistItems(updatedItems);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* 장소 목록 */}
        <FlatList
          data={locations}
          horizontal
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.locationItem, 
                selectedLocation?.id === item.id && styles.selectedLocationItem
              ]}
              onPress={() => setSelectedLocation(item)}
            >
              <Text>{item.name}</Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />

        {/* 새 장소 추가 버튼 */}
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* 장소 추가 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalView}>
          <TextInput
            style={styles.input}
            value={newLocationName}
            onChangeText={setNewLocationName}
            placeholder="새 장소 이름"
          />
          <Button title="추가" onPress={addLocation} />
          <Button title="취소" onPress={() => setModalVisible(false)} />
        </View>
      </Modal>

      {/* 선택된 장소의 체크리스트 */}
      {selectedLocation && (
        <View style={styles.checklistContainer}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newItemName}
              onChangeText={setNewItemName}
              placeholder="새 아이템 추가"
            />
            <Button title="추가" onPress={addChecklistItem} />
          </View>
          <FlatList
            data={checklistItems.filter(item => item.locationId === selectedLocation.id)}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.checklistItem}
                onPress={() => toggleChecklistItem(item.id)}
              >
                <Text style={item.isChecked ? styles.checkedItem : {}}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    marginRight: 10,
  },
  locationItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 50, // 동그라미 형태
  },
  selectedLocationItem: {
    backgroundColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#007bff',
    borderRadius: 50,
    padding: 10,
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  checklistContainer: {
    flex: 1,
  },
  checklistItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  checkedItem: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
});

export default MainScreen; 