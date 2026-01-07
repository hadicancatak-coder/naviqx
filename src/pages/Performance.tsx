import { PageContainer, PageHeader } from "@/components/layout";

const Performance = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Performance"
        description="Performance reports and analytics"
      />
      
      <div className="mt-lg bg-elevated rounded-xl border border-border overflow-hidden">
        <iframe
          width="100%"
          height="800"
          src="https://lookerstudio.google.com/embed/reporting/6bf63f4d-ce3a-4cb1-9dec-5e364cee18a2/page/p_mgemrhyxyd"
          frameBorder="0"
          style={{ border: 0 }}
          allowFullScreen
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </PageContainer>
  );
};

export default Performance;
