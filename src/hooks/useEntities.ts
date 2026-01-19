// DEPRECATED: Use useSystemEntities from @/hooks/useSystemEntities instead
// This file is kept for backwards compatibility but re-exports from the canonical source

import { useSystemEntities, type SystemEntity } from "./useSystemEntities";

export interface Entity {
  id: string;
  name: string;
  code?: string;
  is_active?: boolean;
}

/**
 * @deprecated Use useSystemEntities from @/hooks/useSystemEntities instead
 * This hook now wraps useSystemEntities for backwards compatibility
 */
export const useEntities = () => {
  const query = useSystemEntities();
  
  // Map to simpler Entity type for backwards compatibility
  return {
    ...query,
    data: query.data?.map((entity: SystemEntity) => ({
      id: entity.id,
      name: entity.name,
      code: entity.code,
      is_active: entity.is_active,
    })) as Entity[] | undefined,
  };
};
