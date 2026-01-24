'use client';

import { useState, useMemo } from 'react';
import styled from 'styled-components';
import { Search, Globe, Users, Zap, Shield, Check, ChevronRight } from 'lucide-react';
import { Input } from '../Input';
import { Stack } from '../Stack';
import { SmallText, Caption } from '../Typography';

// ============ Types ============
export interface ServerOption {
  url: string;
  name: string;
  description?: string;
  users?: number;
  badges?: ('popular' | 'fast' | 'reliable' | 'official' | 'recommended')[];
  region?: string;
}

export interface ServerSelectorProps {
  servers: ServerOption[];
  value: string;
  onChange: (url: string) => void;
  allowCustom?: boolean;
  customPlaceholder?: string;
  searchPlaceholder?: string;
  label?: string;
  hint?: string;
  platformColor?: string;
}

// ============ Styled Components ============
const SelectorContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`;

const SearchWrapper = styled.div`
  position: relative;
`;

const SearchIcon = styled.div`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: ${({ theme }) => theme.colors.text.tertiary};
  pointer-events: none;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[3]} ${theme.spacing[3]} ${theme.spacing[3]} 40px`};
  border: 1px solid ${({ theme }) => theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  background: ${({ theme }) => theme.colors.background.primary};
  color: ${({ theme }) => theme.colors.text.primary};
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.primary[500]};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.tertiary};
  }
`;

const ServerList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  max-height: 280px;
  overflow-y: auto;
  padding-right: ${({ theme }) => theme.spacing[1]};

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${({ theme }) => theme.colors.neutral[100]};
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral[300]};
    border-radius: 3px;
  }
`;

const ServerCard = styled.button<{ $selected: boolean; $color?: string }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $selected, theme }) =>
    $selected ? theme.colors.primary[50] : theme.colors.background.primary};
  border: 2px solid ${({ $selected, $color, theme }) =>
    $selected ? ($color || theme.colors.primary[500]) : theme.colors.border.light};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  width: 100%;

  &:hover {
    border-color: ${({ $selected, $color, theme }) =>
      $selected ? ($color || theme.colors.primary[500]) : theme.colors.border.default};
    background: ${({ $selected, theme }) =>
      $selected ? theme.colors.primary[50] : theme.colors.neutral[50]};
  }
`;

const ServerIcon = styled.div<{ $color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  background: ${({ $color, theme }) =>
    $color ? `${$color}15` : theme.colors.neutral[100]};
  color: ${({ $color, theme }) => $color || theme.colors.text.secondary};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ServerInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ServerName = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: 2px;
`;

const ServerUrl = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ServerMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[1]};
`;

const BadgeContainer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  flex-wrap: wrap;
`;

const Badge = styled.span<{ $type: string }>`
  font-size: 10px;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.borderRadius.full};
  background: ${({ $type, theme }) => {
    switch ($type) {
      case 'popular': return theme.colors.primary[100];
      case 'fast': return theme.colors.success[100];
      case 'reliable': return theme.colors.neutral[100];
      case 'official': return theme.colors.warning[100];
      case 'recommended': return theme.colors.success[100];
      default: return theme.colors.neutral[100];
    }
  }};
  color: ${({ $type, theme }) => {
    switch ($type) {
      case 'popular': return theme.colors.primary[700];
      case 'fast': return theme.colors.success[700];
      case 'reliable': return theme.colors.neutral[700];
      case 'official': return theme.colors.warning[700];
      case 'recommended': return theme.colors.success[700];
      default: return theme.colors.neutral[700];
    }
  }};
`;

const UserCount = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const SelectedIcon = styled.div<{ $color?: string }>`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${({ $color, theme }) => $color || theme.colors.primary[500]};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CustomServerSection = styled.div`
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border.light};
`;

const CustomServerLabel = styled.span`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const formatUserCount = (count: number): string => {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(0)}K`;
  return count.toString();
};

const badgeLabels: Record<string, string> = {
  popular: '🔥 Popular',
  fast: '⚡ Fast',
  reliable: '✓ Reliable',
  official: '★ Official',
  recommended: '👍 Recommended',
};

// ============ Component ============
export function ServerSelector({
  servers,
  value,
  onChange,
  allowCustom = true,
  customPlaceholder = 'https://your-server.com',
  searchPlaceholder = 'Search servers...',
  label,
  hint,
  platformColor,
}: ServerSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const filteredServers = useMemo(() => {
    if (!searchQuery) return servers;
    const query = searchQuery.toLowerCase();
    return servers.filter(
      (server) =>
        server.name.toLowerCase().includes(query) ||
        server.url.toLowerCase().includes(query) ||
        server.description?.toLowerCase().includes(query)
    );
  }, [servers, searchQuery]);

  const isCustomValue = value && !servers.some(s => s.url === value);

  return (
    <SelectorContainer>
      {label && <SmallText style={{ fontWeight: 500 }}>{label}</SmallText>}

      <SearchWrapper>
        <SearchIcon>
          <Search size={16} />
        </SearchIcon>
        <SearchInput
          type="text"
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </SearchWrapper>

      <ServerList>
        {filteredServers.map((server) => (
          <ServerCard
            key={server.url}
            $selected={value === server.url}
            $color={platformColor}
            onClick={() => onChange(server.url)}
          >
            <ServerIcon $color={platformColor}>
              <Globe size={20} />
            </ServerIcon>
            <ServerInfo>
              <ServerName>{server.name}</ServerName>
              <ServerUrl>{server.url}</ServerUrl>
              <ServerMeta>
                {server.badges && server.badges.length > 0 && (
                  <BadgeContainer>
                    {server.badges.map((badge) => (
                      <Badge key={badge} $type={badge}>
                        {badgeLabels[badge]}
                      </Badge>
                    ))}
                  </BadgeContainer>
                )}
                {server.users && (
                  <UserCount>
                    <Users size={12} />
                    {formatUserCount(server.users)} users
                  </UserCount>
                )}
              </ServerMeta>
            </ServerInfo>
            {value === server.url && (
              <SelectedIcon $color={platformColor}>
                <Check size={14} />
              </SelectedIcon>
            )}
          </ServerCard>
        ))}

        {filteredServers.length === 0 && (
          <SmallText style={{ textAlign: 'center', padding: '16px', color: '#666' }}>
            No servers found matching &quot;{searchQuery}&quot;
          </SmallText>
        )}
      </ServerList>

      {allowCustom && (
        <CustomServerSection>
          <CustomServerLabel>Or enter a custom server URL:</CustomServerLabel>
          <Input
            type="text"
            value={isCustomValue ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customPlaceholder}
            fullWidth
          />
        </CustomServerSection>
      )}

      {hint && <Caption style={{ color: '#666' }}>{hint}</Caption>}
    </SelectorContainer>
  );
}

export default ServerSelector;
