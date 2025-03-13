export interface Location {
  id: string;
  name: string;
}

export interface ChecklistItem {
  id: string;
  name: string;
  isChecked: boolean;
  locationId: string;
} 