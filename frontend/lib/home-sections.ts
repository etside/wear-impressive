/**
 * Home page section model.
 *
 * Sections are stored as a JSON array under the StoreSetting key
 * `home.sections`. The dashboard composer writes them, and the storefront
 * `/shops/{handle}` page reads them and dispatches to the matching component.
 *
 * Adding a new section type means: extend the union in this file, register a
 * default in `defaultSection()`, add an editor card in the dashboard builder,
 * and add a renderer branch in the storefront SectionRenderer. Three places
 * — kept on purpose so the type system catches new sections everywhere.
 */

export type CarouselSlide = {
  image: string;
  link?: string | null;
};

export type BannerCard = {
  image: string;
  link?: string | null;
};

export type ProductSectionSource =
  | { type: 'category'; category_id: number }
  | { type: 'manual'; product_ids: number[] };

export interface CarouselSectionData {
  id: string;
  type: 'carousel';
  visible: boolean;
  slides: CarouselSlide[];
  /** Auto-rotate interval in ms, or 0 to disable. */
  autoplay_ms?: number;
}

export interface BannerRowSectionData {
  id: string;
  type: 'banner_row';
  visible: boolean;
  cards: BannerCard[];
  /** Display columns on desktop. Mobile always falls back to 2. */
  columns: 2 | 3 | 4;
}

export interface ProductSectionData {
  id: string;
  type: 'product_section';
  visible: boolean;
  /** Bilingual heading (BN falls back to EN at render time). */
  name_en: string;
  name_bn?: string;
  /** Where the products come from — a category, or an explicit id list. */
  source: ProductSectionSource;
  /** When source.type === 'category': "all" or a number cap. Ignored for manual. */
  limit: number | 'all';
  /** Display columns on desktop. Mobile always falls back to 2. */
  columns: 2 | 3 | 4;
}

export interface ReviewsGallerySectionData {
  id: string;
  type: 'reviews_gallery';
  visible: boolean;
  /** Bilingual heading. */
  name_en: string;
  name_bn?: string;
  /** Customer-review image URLs. Order is preserved. */
  images: string[];
  /** Desktop columns. Mobile always uses a 2-card horizontal carousel. */
  columns: 3 | 4 | 5;
}

export type HomeSection =
  | CarouselSectionData
  | BannerRowSectionData
  | ProductSectionData
  | ReviewsGallerySectionData;

export const SECTION_TYPE_LABELS: Record<HomeSection['type'], string> = {
  carousel: 'Image Carousel',
  banner_row: 'Offer Banner Row',
  product_section: 'Product Section',
  reviews_gallery: 'Customer Reviews Gallery',
};

let _counter = 0;
function newId(prefix: string): string {
  _counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${_counter}`;
}

export function defaultSection(type: HomeSection['type']): HomeSection {
  switch (type) {
    case 'carousel':
      return {
        id: newId('sec'),
        type: 'carousel',
        visible: true,
        slides: [],
        autoplay_ms: 5000,
      };
    case 'banner_row':
      return {
        id: newId('sec'),
        type: 'banner_row',
        visible: true,
        cards: [],
        columns: 3,
      };
    case 'product_section':
      return {
        id: newId('sec'),
        type: 'product_section',
        visible: true,
        name_en: 'New Section',
        name_bn: '',
        source: { type: 'category', category_id: 0 },
        limit: 8,
        columns: 4,
      };
    case 'reviews_gallery':
      return {
        id: newId('sec'),
        type: 'reviews_gallery',
        visible: true,
        name_en: 'Happy Customers',
        name_bn: 'সন্তুষ্ট গ্রাহক',
        images: [],
        columns: 4,
      };
  }
}

/** Type guard helpers for narrowing in renderer/editor. */
export function isCarousel(s: HomeSection): s is CarouselSectionData {
  return s.type === 'carousel';
}
export function isBannerRow(s: HomeSection): s is BannerRowSectionData {
  return s.type === 'banner_row';
}
export function isProductSection(s: HomeSection): s is ProductSectionData {
  return s.type === 'product_section';
}
export function isReviewsGallery(s: HomeSection): s is ReviewsGallerySectionData {
  return s.type === 'reviews_gallery';
}
