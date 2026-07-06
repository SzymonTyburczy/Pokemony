export interface Pokemon3dForm {
  name: string;
  formName: string;
  model: string;
}

export interface Pokemon3dEntry {
  id: number;
  forms: Pokemon3dForm[];
}

export interface Pokemon3dSelection {
  id: number;
  pokemonName: string;
  form: Pokemon3dForm;
  forms: Pokemon3dForm[];
}
