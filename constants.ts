
import { Project, ProjectStatus, Visibility, ResearchArea, NewsItem } from './types';

export const HERO_IMAGES = [
  // Vaccine Innovation: Clean modern clinical lab and vaccine research
  'https://images.unsplash.com/photo-1584036561566-baf241830990?auto=format&fit=crop&w=1920&q=80',
  // Diagnostic Excellence: Advanced diagnostic testing and systems
  'https://images.unsplash.com/photo-1579154204601-01588f351167?auto=format&fit=crop&w=1920&q=80',
  // Pharmaceutical Research: Biochemistry, herbal validation and pharma research
  'https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?auto=format&fit=crop&w=1920&q=80'
];

export const PROJECTS: Project[] = [
  {
    id: 'p1',
    title: 'AI-Driven Malaria Diagnostic System',
    description: 'A low-cost, smartphone-based system for rapid detection of malaria parasites. Open to Collaboration: YES. Funding Required: $45,000.',
    department: 'Computer Science',
    status: ProjectStatus.Validation,
    visibility: Visibility.Public,
    trl: 4,
    research_area: ResearchArea.Diagnostics,
    image_url: 'https://images.unsplash.com/photo-1530026405186-ed1f139313f8?auto=format&fit=crop&w=800&q=80',
    budget: '$45,000',
    start_date: '2023-01-15',
    achievements: ['98% accuracy in pilot', 'Cloud integration complete'],
    needs: ['Clinical partners in rural areas', 'Cloud computing credits']
  },
  {
    id: 'p2',
    title: 'Novel Plant-Based Vaccine Adjuvants',
    description: 'Extracting immune-boosting compounds from indigenous Ghanaian medicinal plants. Open to Collaboration: YES.',
    department: 'Pharmacology',
    status: ProjectStatus.Prototype,
    visibility: Visibility.Internal,
    trl: 3,
    research_area: ResearchArea.Vaccines,
    image_url: 'https://images.unsplash.com/photo-1633613286991-611fe299c4be?auto=format&fit=crop&w=800&q=80',
    budget: '$120,000',
    start_date: '2023-06-01'
  },
  {
    id: 'p4',
    title: 'Automated Sickle Cell Screening Device',
    description: 'Portable point-of-care device for early detection of Sickle Cell Disease. Funding Required: $250,000.',
    department: 'Biomedical Engineering',
    status: ProjectStatus.MarketReady,
    visibility: Visibility.Public,
    trl: 6,
    research_area: ResearchArea.Diagnostics,
    image_url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    budget: '$250,000',
    start_date: '2021-11-20'
  }
];

export const LATEST_NEWS: NewsItem[] = [
  {
    id: 'n1',
    title: 'UG Partners with Novartis for Clinical Trials',
    category: 'Partnership',
    published_at: '2024-05-15',
    image_url: 'https://images.unsplash.com/photo-1579684385180-1ea55f9f8c60?auto=format&fit=crop&w=400&q=80',
    summary: 'A landmark agreement to accelerate clinical trials for neglected tropical diseases.'
  }
];
