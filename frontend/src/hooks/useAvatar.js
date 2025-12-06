// frontend/src/hooks/useAvatar.js
// React Hook for Avatar Management
// Handles saving/loading avatar cosmetics to/from backend

import { useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:4000';

/**
 * Avatar data format:
 * {
 *   body: 'body_0',
 *   hair: 'hair_2',
 *   eyes: 'eyes_1',
 *   tops: 'tops_3',
 *   bottoms: 'bottoms_1',
 *   shoes: 'shoes_0',
 *   hat: null,
 *   accessory: null,
 *   weapon: null,
 *   effect: null
 * }
 */

/**
 * Hook for managing player avatar
 * @param {string} wallet - Player wallet address
 * @returns {Object} { avatar, loading, error, saveAvatar, loadAvatar, setLocalAvatar }
 */
export function useAvatar(wallet) {
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load avatar from backend
   */
  const loadAvatar = useCallback(async () => {
    if (!wallet) {
      setError('No wallet address');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/player/${wallet}/avatar`);
      
      if (!response.ok) {
        // Try alternate endpoint
        const profileRes = await fetch(`${API_BASE}/profile?address=${wallet}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          if (profileData.equipped) {
            setAvatar(profileData.equipped);
            return profileData.equipped;
          }
        }
        throw new Error(`Failed to load avatar: ${response.status}`);
      }

      const data = await response.json();
      const avatarData = data.avatar || data.equipped || data;
      setAvatar(avatarData);
      return avatarData;
    } catch (err) {
      console.error('[useAvatar] Load error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Save avatar to backend
   * @param {Object} avatarData - Avatar cosmetics object
   * @returns {Promise<boolean>} Success status
   */
  const saveAvatar = useCallback(async (avatarData) => {
    if (!wallet) {
      setError('No wallet address');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // Try the dedicated avatar endpoint first
      let response = await fetch(`${API_BASE}/api/player/${wallet}/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet,
          avatar: avatarData
        }),
      });

      // If that fails, try the profile/equip endpoint
      if (!response.ok) {
        response = await fetch(`${API_BASE}/profile/equip`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            address: wallet,
            equipped: avatarData
          }),
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to save avatar: ${response.status}`);
      }

      setAvatar(avatarData);
      console.log('[useAvatar] Avatar saved successfully');
      return true;
    } catch (err) {
      console.error('[useAvatar] Save error:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [wallet]);

  /**
   * Update avatar locally (without saving to backend)
   * @param {Object} avatarData 
   */
  const setLocalAvatar = useCallback((avatarData) => {
    setAvatar(avatarData);
  }, []);

  /**
   * Update a single cosmetic category
   * @param {string} category 
   * @param {string} assetId 
   */
  const setCosmetic = useCallback((category, assetId) => {
    setAvatar(prev => ({
      ...prev,
      [category]: assetId
    }));
  }, []);

  // Load avatar on mount if wallet is provided
  useEffect(() => {
    if (wallet) {
      loadAvatar();
    }
  }, [wallet, loadAvatar]);

  return {
    avatar,
    loading,
    error,
    saveAvatar,
    loadAvatar,
    setLocalAvatar,
    setCosmetic
  };
}

/**
 * Save avatar directly (utility function)
 * @param {string} wallet 
 * @param {Object} avatarData 
 * @returns {Promise<boolean>}
 */
export async function saveAvatarDirect(wallet, avatarData) {
  try {
    // Try dedicated endpoint
    let response = await fetch(`${API_BASE}/api/player/${wallet}/avatar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet, avatar: avatarData }),
    });

    // Fallback to profile/equip
    if (!response.ok) {
      response = await fetch(`${API_BASE}/profile/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: wallet, equipped: avatarData }),
      });
    }

    return response.ok;
  } catch (err) {
    console.error('[saveAvatarDirect] Error:', err);
    return false;
  }
}

/**
 * Load avatar directly (utility function)
 * @param {string} wallet 
 * @returns {Promise<Object|null>}
 */
export async function loadAvatarDirect(wallet) {
  try {
    // Try dedicated endpoint
    let response = await fetch(`${API_BASE}/api/player/${wallet}/avatar`);
    
    if (response.ok) {
      const data = await response.json();
      return data.avatar || data.equipped || data;
    }
    
    // Fallback to profile endpoint
    response = await fetch(`${API_BASE}/profile?address=${wallet}`);
    if (response.ok) {
      const data = await response.json();
      return data.equipped || null;
    }
    
    return null;
  } catch (err) {
    console.error('[loadAvatarDirect] Error:', err);
    return null;
  }
}

export default useAvatar;
