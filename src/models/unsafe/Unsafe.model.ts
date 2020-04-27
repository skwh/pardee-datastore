import { Template } from '../template/Template.model';

export interface UnsafeColumn {
  name?: string;
  type?: string;
  label?: string;
  modifier?: string;
}

export interface UnsafeGroup {
  name?: string;
  dataseries?: Record<string, unknown>[];
}

export interface UnsafeSeries {
  name?: string;
  group?: string;
  location?: string;
  type?: string;
  category?: string;
  metadata?: Record<string, string>;
}

export interface UnsafeSettings {
  columns?: UnsafeColumn[];
  template?: Template;
  groups?: UnsafeGroup[];
}

export interface UnsafeQuery {
  domain?: {
    key: string;
    values?: string[];
  }[];
  dyad?: {
    p: {
      key: string;
      values?: string[];
    };
    q: {
      cokey: string;
      values?: string[];
    };
  };
  range?: {
    from?: string;
    to?: string;
    values?: string[];
  };
  special?: string[];
}