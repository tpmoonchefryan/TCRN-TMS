// © 2026 月球厨师莱恩 (TPMOONCHEFRYAN) – PolyForm Noncommercial License

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OrganizationTree, OrganizationList, TreeNode } from '@/components/organization/organization-tree';
import { SubsidiaryInfo, TalentInfo } from '@/stores/talent-store';

// Test data factories
function createTestTalent(overrides: Partial<TalentInfo> = {}): TalentInfo {
  return {
    id: 'talent-1',
    code: 'T001',
    displayName: 'Test Talent',
    path: '/tenant/talent-1',
    ...overrides,
  };
}

function createTestSubsidiary(overrides: Partial<SubsidiaryInfo> = {}): SubsidiaryInfo {
  return {
    id: 'sub-1',
    code: 'SUB001',
    displayName: 'Test Subsidiary',
    path: '/tenant/sub-1',
    talents: [],
    children: [],
    ...overrides,
  };
}

function createNestedTestData(): {
  subsidiaries: SubsidiaryInfo[];
  directTalents: TalentInfo[];
} {
  return {
    subsidiaries: [
      {
        id: 'sub-1',
        code: 'SUB001',
        displayName: 'Division A',
        path: '/tenant/sub-1',
        parentId: null,
        talents: [
          createTestTalent({ id: 'talent-1', displayName: 'Talent A1' }),
          createTestTalent({ id: 'talent-2', displayName: 'Talent A2' }),
        ],
        children: [
          {
            id: 'sub-1-1',
            code: 'SUB001-1',
            displayName: 'Division A-1',
            path: '/tenant/sub-1/sub-1-1',
            parentId: 'sub-1',
            talents: [
              createTestTalent({ id: 'talent-3', displayName: 'Talent A1-1' }),
            ],
            children: [],
          },
        ],
      },
      {
        id: 'sub-2',
        code: 'SUB002',
        displayName: 'Division B',
        path: '/tenant/sub-2',
        parentId: null,
        talents: [],
        children: [],
      },
    ],
    directTalents: [
      createTestTalent({ id: 'direct-talent-1', displayName: 'Direct Talent' }),
    ],
  };
}

describe('OrganizationTree Component', () => {
  const defaultProps = {
    tenantName: 'Test Tenant',
    tenantId: 'tenant-1',
    subsidiaries: [] as SubsidiaryInfo[],
    directTalents: [] as TalentInfo[],
  };

  describe('Basic Rendering', () => {
    it('should render tenant as root node', () => {
      render(<OrganizationTree {...defaultProps} />);

      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });

    it('should render organization structure header when not compact', () => {
      render(<OrganizationTree {...defaultProps} />);

      expect(screen.getByText('Organization Structure')).toBeInTheDocument();
    });

    it('should not render header in compact mode', () => {
      render(<OrganizationTree {...defaultProps} compact={true} />);

      expect(screen.queryByText('Organization Structure')).not.toBeInTheDocument();
    });

    it('should render subsidiaries under tenant', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Division B')).toBeInTheDocument();
    });

    it('should render direct talents under tenant', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      expect(screen.getByText('Direct Talent')).toBeInTheDocument();
    });

    it('should render talents under subsidiaries', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      expect(screen.getByText('Talent A1')).toBeInTheDocument();
      expect(screen.getByText('Talent A2')).toBeInTheDocument();
    });
  });

  describe('Node Expansion/Collapse', () => {
    it('should expand nodes by default at level < 2', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      // Level 0 (tenant) and level 1 (subsidiaries) should be expanded
      expect(screen.getByText('Division A')).toBeInTheDocument();
      expect(screen.getByText('Division A-1')).toBeInTheDocument();
    });

    it('should toggle node expansion when clicking chevron', async () => {
      const user = userEvent.setup();
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      // Find the row containing "Division A"
      const divisionARow = screen.getByText('Division A').closest('div[class*="flex items-center"]');
      expect(divisionARow).toBeInTheDocument();

      // Find and click the toggle button (first button in the row)
      const toggleButton = divisionARow!.querySelector('button');
      expect(toggleButton).toBeInTheDocument();
      
      // Children should be visible initially
      expect(screen.getByText('Talent A1')).toBeInTheDocument();
      
      // Click to collapse
      await user.click(toggleButton!);
      
      // Children should be hidden
      expect(screen.queryByText('Talent A1')).not.toBeInTheDocument();
      
      // Click again to expand
      await user.click(toggleButton!);
      
      // Children should be visible again
      expect(screen.getByText('Talent A1')).toBeInTheDocument();
    });
  });

  describe('Node Selection', () => {
    it('should call onNodeSelect when clicking a node', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          onNodeSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Division A'));

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub-1',
          displayName: 'Division A',
          type: 'subsidiary',
        })
      );
    });

    it('should highlight selected node', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      const selectedNode: TreeNode = {
        id: 'sub-1',
        code: 'SUB001',
        displayName: 'Division A',
        type: 'subsidiary',
      };
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          selectedNode={selectedNode}
        />
      );

      const selectedRow = screen.getByText('Division A').closest('div[class*="flex items-center"]');
      expect(selectedRow).toHaveClass('bg-primary/10');
    });

    it('should not call onNodeSelect when selectable is false', async () => {
      const user = userEvent.setup();
      const mockOnSelect = vi.fn();
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          selectable={false}
          onNodeSelect={mockOnSelect}
        />
      );

      await user.click(screen.getByText('Division A'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Settings Button', () => {
    it('should not show settings button by default', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
        />
      );

      // Settings button should not exist
      expect(screen.queryByTitle('Settings')).not.toBeInTheDocument();
    });

    it('should show settings button when showSettings is true', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          showSettings={true}
        />
      );

      // Settings buttons should exist (one per node)
      const settingsButtons = screen.getAllByTitle('Settings');
      expect(settingsButtons.length).toBeGreaterThan(0);
    });

    it('should call onNavigate with settings action when clicking settings', async () => {
      const user = userEvent.setup();
      const mockOnNavigate = vi.fn();
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          showSettings={true}
          onNavigate={mockOnNavigate}
        />
      );

      // Find settings button in Division A row
      const divisionARow = screen.getByText('Division A').closest('div[class*="flex items-center"]');
      const settingsButton = divisionARow!.querySelector('button[title="Settings"]');
      
      await user.click(settingsButton!);

      expect(mockOnNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sub-1',
          displayName: 'Division A',
        }),
        'settings'
      );
    });
  });

  describe('Accessibility Mode', () => {
    it('should show accessibility toggle when showAccessibility is true', () => {
      const { subsidiaries, directTalents } = createNestedTestData();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={subsidiaries}
          directTalents={directTalents}
          showAccessibility={true}
        />
      );

      // Accessibility toggle buttons should exist
      const toggleButtons = screen.getAllByTitle(/Accessible|Not accessible/);
      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('should call onAccessibilityChange when toggling accessibility', async () => {
      const user = userEvent.setup();
      const mockOnAccessibilityChange = vi.fn();
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={[]}
          directTalents={[]}
          showAccessibility={true}
          accessibilityState={{}}
          onAccessibilityChange={mockOnAccessibilityChange}
        />
      );

      // Find and click the accessibility toggle for tenant
      const toggleButton = screen.getByTitle('Not accessible');
      await user.click(toggleButton);

      expect(mockOnAccessibilityChange).toHaveBeenCalledWith(
        'tenant-1',
        { enabled: true }
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty subsidiaries and talents', () => {
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={[]}
          directTalents={[]}
        />
      );

      // Should render tenant without children
      expect(screen.getByText('Test Tenant')).toBeInTheDocument();
    });

    it('should render talent avatar when avatarUrl is provided', () => {
      const talentsWithAvatar: TalentInfo[] = [
        createTestTalent({
          id: 'talent-avatar',
          displayName: 'Avatar Talent',
          avatarUrl: 'https://example.com/avatar.jpg',
        }),
      ];
      
      render(
        <OrganizationTree
          {...defaultProps}
          subsidiaries={[]}
          directTalents={talentsWithAvatar}
        />
      );

      const avatar = screen.getByRole('img', { name: 'Avatar Talent' });
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <OrganizationTree
          {...defaultProps}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});

describe('OrganizationList Component', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render flattened list of subsidiaries and talents', () => {
    const { subsidiaries, directTalents } = createNestedTestData();
    
    render(
      <OrganizationList
        subsidiaries={subsidiaries}
        directTalents={directTalents}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('Division A')).toBeInTheDocument();
    expect(screen.getByText('Division B')).toBeInTheDocument();
    expect(screen.getByText('Direct Talent')).toBeInTheDocument();
  });

  it('should call onSelect with correct type and id when clicking item', async () => {
    const user = userEvent.setup();
    const { subsidiaries, directTalents } = createNestedTestData();
    
    render(
      <OrganizationList
        subsidiaries={subsidiaries}
        directTalents={directTalents}
        onSelect={mockOnSelect}
      />
    );

    await user.click(screen.getByText('Division A'));

    expect(mockOnSelect).toHaveBeenCalledWith('subsidiary', 'sub-1');
  });

  it('should highlight selected item', () => {
    const { subsidiaries, directTalents } = createNestedTestData();
    
    render(
      <OrganizationList
        subsidiaries={subsidiaries}
        directTalents={directTalents}
        selectedId="sub-1"
        onSelect={mockOnSelect}
      />
    );

    // Find the button containing exactly "Division A" (not "Division A-1")
    const allButtons = screen.getAllByRole('button');
    const selectedButton = allButtons.find(btn => 
      btn.textContent?.includes('Division A') && 
      btn.textContent?.includes('/tenant/sub-1') &&
      !btn.textContent?.includes('Division A-1')
    );
    expect(selectedButton).toBeDefined();
    expect(selectedButton).toHaveClass('bg-primary/10');
  });

  it('should display path for each item', () => {
    const { subsidiaries, directTalents } = createNestedTestData();
    
    render(
      <OrganizationList
        subsidiaries={subsidiaries}
        directTalents={directTalents}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText('/tenant/sub-1')).toBeInTheDocument();
  });
});
