'use client';

import { useState } from 'react';
import styled from 'styled-components';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../Modal';
import { Button } from '../Button';
import { Input } from '../Input';

const WarningIcon = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const IconCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: ${({ theme }) => theme.colors.danger[100]};
  color: ${({ theme }) => theme.colors.danger[600]};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Title = styled.h3`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.text.primary};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const Description = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ConfirmBox = styled.div`
  background-color: ${({ theme }) => theme.colors.warning[50]};
  border: 1px solid ${({ theme }) => theme.colors.warning[200]};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const ConfirmText = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.text.primary};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`;

const ConfirmPhrase = styled.code`
  display: block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.danger[700]};
  background-color: ${({ theme }) => theme.colors.danger[50]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[3]}`};
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing[2]};
`;

const ReasonField = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`;

const Footer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  justify-content: flex-end;
`;

const AuditNote = styled.p`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.text.tertiary};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing[4]};
`;

export interface DangerConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  confirmPhrase: string;
  isLoading?: boolean;
  requireReason?: boolean;
}

export function DangerConfirm({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmPhrase,
  isLoading = false,
  requireReason = true,
}: DangerConfirmProps) {
  const [typedPhrase, setTypedPhrase] = useState('');
  const [reason, setReason] = useState('');

  const isValid =
    typedPhrase === confirmPhrase && (!requireReason || reason.trim().length > 0);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(reason);
    }
  };

  const handleClose = () => {
    setTypedPhrase('');
    setReason('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm">
      <WarningIcon>
        <IconCircle>
          <AlertTriangle size={32} />
        </IconCircle>
      </WarningIcon>

      <Title>{title}</Title>
      <Description>{description}</Description>

      <ConfirmBox>
        <ConfirmText>
          To confirm this action, type the following phrase exactly:
        </ConfirmText>
        <ConfirmPhrase>{confirmPhrase}</ConfirmPhrase>
      </ConfirmBox>

      <Input
        type="text"
        placeholder="Type the phrase above"
        value={typedPhrase}
        onChange={(e) => setTypedPhrase(e.target.value)}
        fullWidth
        error={
          typedPhrase.length > 0 && typedPhrase !== confirmPhrase
            ? 'Phrase does not match'
            : undefined
        }
      />

      {requireReason && (
        <ReasonField>
          <Input
            label="Reason for this action"
            type="text"
            placeholder="Why are you performing this action?"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            fullWidth
            hint="Required for audit log"
          />
        </ReasonField>
      )}

      <Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleConfirm}
          disabled={!isValid || isLoading}
          isLoading={isLoading}
        >
          Confirm
        </Button>
      </Footer>

      <AuditNote>
        This action will be logged with your user ID, timestamp, and reason.
      </AuditNote>
    </Modal>
  );
}
