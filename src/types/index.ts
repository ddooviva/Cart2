export interface Location {
  id: string;
  name: string;
  isHighlighted?: boolean;
}

export interface ChecklistItem {
  id: string;
  name: string;
  isChecked: boolean;
  locationId: string;
}