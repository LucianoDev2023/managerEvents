// context/RegistrationFlowContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

type RegistrationFlowContextType = {
  cameFromRegister: boolean;
  setCameFromRegister: (value: boolean) => void;
};

const RegistrationFlowContext = createContext<
  RegistrationFlowContextType | undefined
>(undefined);

export function RegistrationFlowProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cameFromRegister, setCameFromRegister] = useState(false);

  return (
    <RegistrationFlowContext.Provider
      value={{ cameFromRegister, setCameFromRegister }}
    >
      {children}
    </RegistrationFlowContext.Provider>
  );
}

export function useRegistrationFlow() {
  const context = useContext(RegistrationFlowContext);
  if (!context) {
    throw new Error(
      'useRegistrationFlow deve ser usado dentro de RegistrationFlowProvider'
    );
  }
  return context;
}
