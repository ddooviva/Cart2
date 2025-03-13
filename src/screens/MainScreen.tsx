import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  TextInput, 
  Button, 
  StyleSheet, 
  Modal,
  FlatList,
  Dimensions,
  LayoutRectangle
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  useWorkletCallback,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { Location, ChecklistItem } from '../types';
import { storeData, getData } from '../utils/storage';
import uuid from 'react-native-uuid';
import Icon from 'react-native-vector-icons/Ionicons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface LocationWithLayout extends Location {
  layout?: LayoutRectangle;
}

const DraggableItem = React.memo(({ 
  item, 
  onToggle, 
  layoutsRef,
  onMove 
}: { 
  item: ChecklistItem;
  onToggle: (id: string) => void;
  layoutsRef: Animated.SharedValue<{[key: string]: { x: number, y: number, width: number, height: number }}>;
  onMove: (item: ChecklistItem, locationId: string) => void;
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const isDropArea = useSharedValue(false);
  const [isDragging, setIsDragging] = useState(false);

  const checkIfOverLocation = useCallback((x: number, y: number): string | null => {
    'worklet';
    const layouts = layoutsRef.value;
    for (const locationId in layouts) {
      const layout = layouts[locationId];
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        return locationId;
      }
    }
    return null;
  }, []);

  const gesture = Gesture.Pan()
    .onBegin(() => {
      scale.value = withSpring(1.1);
      runOnJS(setIsDragging)(true);
    })
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      
      const locationId = checkIfOverLocation(e.absoluteX, e.absoluteY);
      isDropArea.value = locationId !== null;
    })
    .onEnd((e) => {
      const locationId = checkIfOverLocation(e.absoluteX, e.absoluteY);
      if (locationId !== null) {
        runOnJS(onMove)(item, locationId);
      }
      
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      scale.value = withSpring(1);
      runOnJS(setIsDragging)(false);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
    zIndex: isDragging ? 100 : 1,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <AnimatedTouchable
        style={[
          styles.checklistItem,
          item.isChecked && styles.checkedItemContainer,
          animatedStyle
        ]}
      >
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={() => onToggle(item.id)}
        >
          <View style={[
            styles.checkbox,
            item.isChecked && styles.checkboxChecked
          ]}>
            {item.isChecked && <Icon name="checkmark" size={16} color="#fff" />}
          </View>
          <Text style={item.isChecked ? styles.checkedItemText : styles.itemText}>
            {item.name}
          </Text>
        </TouchableOpacity>
      </AnimatedTouchable>
    </GestureDetector>
  );
});

const MainScreen: React.FC = () => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [newLocationName, setNewLocationName] = useState<string>('');
  const [newItemName, setNewItemName] = useState<string>('');
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const layoutsRef = useSharedValue<{[key: string]: { x: number, y: number, width: number, height: number }}>({});

  useEffect(() => {
    loadSavedData();
  }, []);

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

  const updateLocationLayout = useCallback((locationId: string, layout: any) => {
    layoutsRef.value = {
      ...layoutsRef.value,
      [locationId]: {
        x: layout.x,
        y: layout.y,
        width: layout.width,
        height: layout.height
      }
    };
  }, []);

  const moveItemToLocation = useCallback((item: ChecklistItem, newLocationId: string) => {
    if (item.locationId !== newLocationId) {
      const updatedItems = checklistItems.map(checkItem =>
        checkItem.id === item.id
          ? { ...checkItem, locationId: newLocationId }
          : checkItem
      );
      saveChecklistItems(updatedItems);
    }
  }, [checklistItems]);

  const addLocation = () => {
    if (!newLocationName.trim()) return;

    const newLocation: Location = {
      id: uuid.v4().toString(),
      name: newLocationName.trim()
    };

    const updatedLocations = [...locations, newLocation];
    saveLocations(updatedLocations);
    setNewLocationName('');
    setModalVisible(false);
  };

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

  const toggleChecklistItem = (itemId: string) => {
    const updatedItems = checklistItems.map(item => 
      item.id === itemId ? { ...item, isChecked: !item.isChecked } : item
    );
    saveChecklistItems(updatedItems);
  };

  const getFilteredItems = () => {
    if (!selectedLocation) return [];
    
    const locationItems = checklistItems.filter(item => 
      item.locationId === selectedLocation.id
    );
    
    return [
      ...locationItems.filter(item => !item.isChecked),
      ...locationItems.filter(item => item.isChecked)
    ];
  };

  const renderItem = useCallback(({ item }: { item: ChecklistItem }) => {
    return (
      <DraggableItem
        item={item}
        onToggle={toggleChecklistItem}
        layoutsRef={layoutsRef}
        onMove={moveItemToLocation}
      />
    );
  }, [toggleChecklistItem, moveItemToLocation, layoutsRef]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.header}>
        <FlatList
          data={locations}
          horizontal
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.locationItem, 
                selectedLocation?.id === item.id && styles.selectedLocationItem
              ]}
              onLayout={(event) => updateLocationLayout(item.id, event.nativeEvent.layout)}
              onPress={() => setSelectedLocation(item)}
            >
              <Text style={selectedLocation?.id === item.id ? styles.selectedLocationText : {}}>
                {item.name}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setModalVisible(true)}
        >
          <Icon name="add" size={30} color="#fff" />
        </TouchableOpacity>
      </View>

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
            data={getFilteredItems()}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
          />
        </View>
      )}

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
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    height: 50,
  },
  locationList: {
    flex: 1,
  },
  locationItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedLocationItem: {
    backgroundColor: '#007bff',
  },
  selectedLocationText: {
    color: '#fff',
  },
  draggingItem: {
    opacity: 0.7,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  addButton: {
    backgroundColor: '#007bff',
    borderRadius: 50,
    padding: 10,
    marginLeft: 10,
  },
  checklistContainer: {
    flex: 1,
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
    borderRadius: 5,
  },
  checklistItem: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  checkedItemContainer: {
    backgroundColor: '#f9f9f9',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007bff',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007bff',
  },
  itemText: {
    fontSize: 16,
  },
  checkedItemText: {
    fontSize: 16,
    textDecorationLine: 'line-through',
    color: '#888',
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
  dropArea: {
    borderWidth: 2,
    borderColor: '#007bff',
    borderStyle: 'dashed',
  },
});

export default MainScreen;