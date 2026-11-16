import { ServiceCategory, MoroccanCity } from '../types';

export interface CategoryItem {
  name: ServiceCategory;
  icon: string;
  description: string;
}

export const SERVICE_CATEGORIES: CategoryItem[] = [
  { 
    name: 'Maison & Réparation', 
    icon: '🔧', 
    description: 'Plomberie, électricité, peinture, serrurerie, menuiserie' 
  },
  { 
    name: 'Digital & Créatif', 
    icon: '🎨', 
    description: 'Design Canva, logos, réseaux sociaux, montage vidéo' 
  },
  { 
    name: 'Cours & Formation', 
    icon: '📚', 
    description: 'Soutien scolaire, langues, sciences, révision examens' 
  },
  { 
    name: 'Ménage', 
    icon: '✨', 
    description: 'Nettoyage domicile, repassage, après travaux' 
  },
  { 
    name: 'Informatique', 
    icon: '💻', 
    description: 'Dépannage PC/Mac, installation logiciels, réseaux' 
  },
  { 
    name: 'Transport & Livraison', 
    icon: '🚚', 
    description: 'Déménagement, transport de colis, courses' 
  },
  { 
    name: 'Événementiel', 
    icon: '📸', 
    description: 'Photographie, animation, traiteur familial' 
  },
  { 
    name: 'Autres services', 
    icon: '⚡', 
    description: 'Assistance administrative, bricolage divers' 
  }
];

export const MOROCCAN_CITIES: MoroccanCity[] = [
  'Fès',
  'Meknès',
  'Rabat',
  'Casablanca',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Salé',
  'Témara',
  'Kénitra',
  'Oujda',
  'Tétouan',
  'Mohammédia',
  'El Jadida',
  'Safi',
  'Béni Mellal',
  'Khouribga',
  'Nador',
  'Taza',
  'Khémisset',
  'Settat',
  'Berrechid',
  'Larache',
  'Ksar El Kébir',
  'Guelmim',
  'Laâyoune',
  'Dakhla',
  'Ouarzazate',
  'Errachidia',
  'Essaouira',
  'Al Hoceïma',
  'Taroudant',
  'Berkane',
  'Taourirt',
  'Sidi Kacem',
  'Sidi Slimane',
  'Khénifra',
  'Ifrane',
  'Azrou',
  'Sefrou',
  'Midelt',
  'Tinghir',
  'Zagora',
  'Tiznit',
  'Tan-Tan',
  'Smara',
  'Boujdour',
  'Chefchaouen',
  'Fnideq',
  "M'diq",
  'Martil',
  'Assilah',
  'Ouezzane',
  'Youssoufia',
  'Benguerir',
  'Oued Zem',
  'Fquih Ben Salah',
  'Kasba Tadla',
  'Azilal',
  'Guercif',
  'Jerada',
  'Figuig',
  'Bouarfa',
  'Sidi Bennour',
  'Benslimane',
  'Skhirat',
  'Bouznika',
  'Sidi Ifni',
  'Tata',
  'Taounate',
  'Boulemane',
  'Missour',
  'Driouch',
  'Inzegane',
  'Aït Melloul',
  'Dcheira El Jihadia',
  'Biougra',
  'Kelaat Sraghna',
  'Chichaoua',
  'Demnate',
  'Imzouren',
  'Zaïo',
  'Erfoud',
  'Rissani',
  'Tarfaya',
  'Sidi Yahya El Gharb',
  'Souk El Arbaa',
  'Tiflet',
  'Rommani',
  'El Hajeb',
  'Moulay Idriss Zerhoun',
  "Kalaat M'Gouna",
  'Boumalne Dadès',
  'Dar Bouazza',
  'Bouskoura',
  'Nouaceur',
  'Médiouna',
  'Aïn Harrouda',
  'Bejaâd'
];
