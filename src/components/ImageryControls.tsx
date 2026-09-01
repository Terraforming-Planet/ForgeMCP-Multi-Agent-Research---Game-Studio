import {
  IMAGERY_DISPLAY_PRESETS,
  type ImageryDisplayPreset,
  type ImageryDisplaySettings,
} from '../integrations/terra/imageryDisplay'

type Props = {
  value: ImageryDisplaySettings
  onChange: (value: ImageryDisplaySettings) => void
}

const PRESET_LABELS: Array<{ id: Exclude<ImageryDisplayPreset, 'custom'>; label: string; detail: string }> = [
  { id: 'natural', label: 'Oryginał', detail: 'naturalne RGB' },
  { id: 'water', label: 'Widoczność wody', detail: 'ciemniej + kontrast' },
  { id: 'vegetation', label: 'Las i roślinność', detail: 'kolor + kontrast' },
  { id: 'terrain', label: 'Teren i rzeźba', detail: 'kontrast + mniej koloru' },
]

export function ImageryControls({ value, onChange }: Props) {
  const update = (field: keyof Omit<ImageryDisplaySettings, 'preset'>, next: number) => {
    onChange({ ...value, preset: 'custom', [field]: next })
  }

  return <section className="lab-imagery-controls" aria-label="Ustawienia widoczności zdjęć satelitarnych">
    <div className="lab-section-title">
      <div><p className="eyebrow">WIDOCZNOŚĆ OBRAZU</p><h2>Jasność, kontrast i barwy</h2></div>
      <span className="badge badge-tone-neutral">DISPLAY ONLY</span>
    </div>
    <div className="lab-image-presets" role="group" aria-label="Tryby widoczności">
      {PRESET_LABELS.map(preset => <button
        type="button"
        key={preset.id}
        className={value.preset === preset.id ? 'active' : ''}
        onClick={() => onChange(IMAGERY_DISPLAY_PRESETS[preset.id])}
      ><b>{preset.label}</b><small>{preset.detail}</small></button>)}
    </div>
    <div className="lab-image-sliders">
      <label>Jasność <output>{value.brightness}%</output><input aria-label="Jasność obrazu" type="range" min="50" max="160" value={value.brightness} onChange={event => update('brightness', Number(event.target.value))} /></label>
      <label>Kontrast <output>{value.contrast}%</output><input aria-label="Kontrast obrazu" type="range" min="50" max="220" value={value.contrast} onChange={event => update('contrast', Number(event.target.value))} /></label>
      <label>Nasycenie <output>{value.saturation}%</output><input aria-label="Nasycenie obrazu" type="range" min="0" max="220" value={value.saturation} onChange={event => update('saturation', Number(event.target.value))} /></label>
      <label>Odcień <output>{value.hue}°</output><input aria-label="Odcień obrazu" type="range" min="-30" max="30" value={value.hue} onChange={event => update('hue', Number(event.target.value))} /></label>
    </div>
    <p className="lab-note"><b>To tylko podgląd dla człowieka.</b> Filtry nie zmieniają obrazu przekazanego modelowi i nie są NDWI, NDVI ani klasyfikacją terenu. Woda, las i rzeźba pozostają hipotezą do sprawdzenia na właściwych pasmach, DEM/SAR i w terenie.</p>
  </section>
}
