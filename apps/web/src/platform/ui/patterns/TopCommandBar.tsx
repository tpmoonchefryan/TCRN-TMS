import React from 'react';

import { CommandSearchInput, type CommandSearchInputProps } from './CommandSearchInput';

export interface TopCommandBarProps {
  leftArea?: React.ReactNode;
  rightArea?: React.ReactNode;
  searchProps?: CommandSearchInputProps;
}

export const TopCommandBar: React.FC<TopCommandBarProps> = ({ leftArea, rightArea, searchProps }) => {
  return (
    <div className="flex w-full flex-1 items-center justify-between gap-4">
      <div className="flex flex-none items-center gap-4">
        {leftArea}
      </div>

      <div className="hidden max-w-xl flex-1 md:block">
        {searchProps ? <CommandSearchInput {...searchProps} /> : null}
      </div>

      <div className="flex flex-none items-center gap-4">
        {rightArea}
      </div>
    </div>
  );
};
