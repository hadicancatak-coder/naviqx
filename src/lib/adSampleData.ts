import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

export async function insertSampleAds() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to insert sample data',
        variant: 'destructive',
      });
      return;
    }

    const sampleSearchAds = [
      {
        name: 'Sample - Premium Services Campaign',
        ad_name: 'Sample - Premium Services Campaign',
        entity: 'CFI',
        campaign_name: 'Brand Awareness Q1',
        ad_group_name: 'Premium Services',
        ad_type: 'search',
        landing_page: 'https://example.com/premium',
        headlines: ['Get Premium Service Today', 'Expert Solutions Available', 'Transform Your Business'],
        descriptions: ['Contact us for a free consultation', 'Trusted by 10,000+ customers worldwide'],
        sitelinks: ['Pricing', 'Features', 'Support', 'Contact'],
        callouts: ['24/7 Support', 'Free Trial', 'Money Back Guarantee', 'Award Winning'],
        business_name: 'Premium Corp',
        approval_status: 'approved',
        created_by: user.id,
      },
      {
        name: 'Sample - Summer Sale Promo',
        ad_name: 'Sample - Summer Sale Promo',
        entity: 'CFI',
        campaign_name: 'Seasonal Promotions',
        ad_group_name: 'Summer Sale',
        ad_type: 'search',
        landing_page: 'https://example.com/sale',
        headlines: ['Summer Sale - Up to 50% Off', 'Limited Time Offer', 'Shop Best Deals Now'],
        descriptions: ['Hurry! Sale ends soon. Free shipping on all orders', 'Premium quality at unbeatable prices'],
        sitelinks: ['Shop Now', 'View Catalog', 'Deals', 'Gift Cards'],
        callouts: ['Free Shipping', 'Easy Returns', 'Secure Checkout'],
        business_name: 'Shop Corp',
        approval_status: 'pending',
        created_by: user.id,
      },
      {
        name: 'Sample - Service Launch',
        ad_name: 'Sample - Service Launch',
        entity: 'Entity B',
        campaign_name: 'New Product Launch',
        ad_group_name: 'Service Launch',
        ad_type: 'search',
        landing_page: 'https://example.com/new-service',
        headlines: ['Introducing Our New Service', 'Revolutionary Solution', 'Get Started Today'],
        descriptions: ['Join thousands of satisfied customers', 'Fast, reliable, and affordable'],
        sitelinks: ['Learn More', 'Pricing', 'FAQs', 'Demo'],
        callouts: ['No Setup Fee', 'Cancel Anytime', 'Expert Support'],
        business_name: 'Innovation Inc',
        approval_status: 'draft',
        created_by: user.id,
      },
    ];

    const sampleDisplayAds = [
      {
        name: 'Sample - Display Banner Campaign',
        ad_name: 'Sample - Display Banner Campaign',
        entity: 'CFI',
        campaign_name: 'Display Network Q1',
        ad_group_name: 'Awareness Campaign',
        ad_type: 'display',
        landing_page: 'https://example.com/display',
        long_headline: 'Transform Your Business with Our Solutions',
        short_headlines: ['Get Started Today', 'Premium Service', 'Trusted by Thousands'],
        descriptions: ['Contact us for a free consultation and see results', 'Join 10,000+ happy customers worldwide'],
        cta_text: 'Learn More',
        business_name: 'Display Corp',
        approval_status: 'approved',
        created_by: user.id,
      },
      {
        name: 'Sample - Mobile Display Ad',
        ad_name: 'Sample - Mobile Display Ad',
        entity: 'Entity B',
        campaign_name: 'Mobile Campaign',
        ad_group_name: 'Mobile Users',
        ad_type: 'display',
        landing_page: 'https://example.com/mobile',
        long_headline: 'Download Our App and Save 20% on Your First Order',
        short_headlines: ['Shop on the Go', 'Easy Checkout', 'Exclusive Deals'],
        descriptions: ['Available on iOS and Android. Get instant notifications', 'Secure payments and fast delivery'],
        cta_text: 'Download Now',
        business_name: 'Mobile Shop',
        approval_status: 'pending',
        created_by: user.id,
      },
    ];

    const { error } = await supabase
      .from('ads')
      .insert([...sampleSearchAds, ...sampleDisplayAds]);

    if (error) throw error;

    toast({
      title: 'Success',
      description: `Inserted ${sampleSearchAds.length + sampleDisplayAds.length} sample ads`,
    });

    return true;
  } catch (error) {
    logger.error('Error inserting sample ads:', error);
    toast({
      title: 'Error',
      description: 'Failed to insert sample ads',
      variant: 'destructive',
    });
    return false;
  }
}