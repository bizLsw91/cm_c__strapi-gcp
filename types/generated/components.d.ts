import type { Schema, Struct } from '@strapi/strapi';

export interface SharedCategoryItems extends Struct.ComponentSchema {
  collectionName: 'components_shared_category_items';
  info: {
    displayName: 'category_items';
  };
  attributes: {
    item: Schema.Attribute.String;
  };
}

export interface SharedMedia extends Struct.ComponentSchema {
  collectionName: 'components_shared_media';
  info: {
    displayName: 'Media';
    icon: 'file-video';
  };
  attributes: {
    file: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
  };
}

export interface SharedOutline extends Struct.ComponentSchema {
  collectionName: 'components_shared_outlines';
  info: {
    description: '';
    displayName: 'outline';
  };
  attributes: {
    dateText: Schema.Attribute.String;
    location: Schema.Attribute.String;
    organizer: Schema.Attribute.String;
    target: Schema.Attribute.Text;
    topics: Schema.Attribute.Component<'shared.topics', true>;
  };
}

export interface SharedQuote extends Struct.ComponentSchema {
  collectionName: 'components_shared_quotes';
  info: {
    displayName: 'Quote';
    icon: 'indent';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface SharedRichText extends Struct.ComponentSchema {
  collectionName: 'components_shared_rich_texts';
  info: {
    description: '';
    displayName: 'Rich text';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface SharedSeo extends Struct.ComponentSchema {
  collectionName: 'components_shared_seos';
  info: {
    description: '';
    displayName: 'Seo';
    icon: 'allergies';
    name: 'Seo';
  };
  attributes: {
    metaDescription: Schema.Attribute.Text & Schema.Attribute.Required;
    metaTitle: Schema.Attribute.String & Schema.Attribute.Required;
    shareImage: Schema.Attribute.Media<'images'>;
  };
}

export interface SharedSlider extends Struct.ComponentSchema {
  collectionName: 'components_shared_sliders';
  info: {
    description: '';
    displayName: 'Slider';
    icon: 'address-book';
  };
  attributes: {
    files: Schema.Attribute.Media<'images', true>;
  };
}

export interface SharedStatus extends Struct.ComponentSchema {
  collectionName: 'components_shared_statuses';
  info: {
    description: '';
    displayName: 'Status';
  };
  attributes: {
    status_name: Schema.Attribute.String;
  };
}

export interface SharedTopics extends Struct.ComponentSchema {
  collectionName: 'components_shared_topics';
  info: {
    description: '';
    displayName: 'topics';
  };
  attributes: {
    content: Schema.Attribute.Text;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'shared.category-items': SharedCategoryItems;
      'shared.media': SharedMedia;
      'shared.outline': SharedOutline;
      'shared.quote': SharedQuote;
      'shared.rich-text': SharedRichText;
      'shared.seo': SharedSeo;
      'shared.slider': SharedSlider;
      'shared.status': SharedStatus;
      'shared.topics': SharedTopics;
    }
  }
}
