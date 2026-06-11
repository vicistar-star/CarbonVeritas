import { Hero } from '@/components/hero';
import { StatsCards } from '@/components/stats-cards';
import { RetirementsFeed } from '@/components/retirements-feed';
import { FeaturedProjects } from '@/components/featured-projects';

export default function HomePage() {
  return (
    <>
      <Hero />
      <section className="container-page py-12">
        <StatsCards />
      </section>
      <section className="container-page py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <FeaturedProjects />
          </div>
          <div>
            <RetirementsFeed />
          </div>
        </div>
      </section>
    </>
  );
}
