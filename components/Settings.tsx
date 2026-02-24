import React from 'react';
import { PageHeader } from '../src/design/components/PageHeader';
import { Card } from '../src/design/components/Card';

const Settings: React.FC = () => {
  return (
    <div>
      <PageHeader title="Settings" />
      <Card style={{ padding: 16 }}>
        <div className="atlas-help">Settings is a placeholder. Campaign Setup is available from the user menu.</div>
      </Card>
    </div>
  );
};

export default Settings;
