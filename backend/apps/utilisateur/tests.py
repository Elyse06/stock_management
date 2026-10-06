from django.test import TestCase

from apps.employee.models import Direction, Employer, Service
from apps.utilisateur.models import Utilisateur
from apps.utilisateur.serializers import UtilisateurSerializer


class UtilisateurEmployeeLinkTests(TestCase):
	def test_update_employee_link_without_direction_site(self):
		direction = Direction.objects.create(
			dir_libelle="Direction", dir_description=""
		)
		service = Service.objects.create(
			serv_libelle="Service", serv_info="", serv_dir_id=direction
		)
		employee = Employer.objects.create(
			emp_nom="Employé",
			emp_matricule="MAT-EMP",
			emp_fonction="Agent",
			emp_contact="",
			emp_serv_id=service,
		)
		user = Utilisateur.objects.create(
			utilisateur_mail="employe@example.com",
			utilisateur_mdp="hashed-password",
		)

		serializer = UtilisateurSerializer(
			user, data={"emp_id": employee.pk}, partial=True
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		serializer.save()

		employee.refresh_from_db()
		self.assertEqual(employee.emp_utilisateur_id, user)
		self.assertEqual(employee.emp_dir_id, direction)
		self.assertIsNone(employee.emp_site_id)
